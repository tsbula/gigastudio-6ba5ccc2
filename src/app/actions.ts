"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MS,
  createSession,
  destroySession,
  generateLoginCode,
  getCurrentUser,
  normalizePhone,
} from "@/lib/auth";
import { demoLoginUserId } from "@/lib/demo";
import { withDb, type VolleyEvent } from "@/lib/db";
import {
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  activeCount,
  eventEnd,
  findUserSignup,
  getSignups,
  parseStart,
  withdrawBlockReason,
} from "@/lib/events";

export type AuthResult =
  | { ok: true; code?: string; registered?: boolean; regToken?: string; attemptsLeft?: number }
  | { ok: false; error: string };

export type FormResult = { ok?: boolean; error?: string };

function refreshEventViews(eventId: string) {
  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
}

/* ---------------------------------- auth ---------------------------------- */

export async function requestLoginCode(phoneRaw: string): Promise<AuthResult> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) {
    return { ok: false, error: "Введите номер в формате +7 (900) 123-45-67" };
  }
  const code = generateLoginCode();
  await withDb((db) => {
    db.loginCodes = db.loginCodes.filter((c) => c.phone !== phone);
    db.loginCodes.push({
      id: randomUUID(),
      phone,
      code,
      attemptsLeft: CODE_MAX_ATTEMPTS,
      expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      verified: false,
    });
  });
  // СМС-шлюз не подключён — код показываем на экране.
  return { ok: true, code };
}

export async function verifyLoginCode(
  phoneRaw: string,
  codeInput: string
): Promise<AuthResult> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: "Некорректный номер телефона" };
  const submitted = codeInput.replace(/\D/g, "");
  if (submitted.length !== 6) {
    return { ok: false, error: "Код состоит из 6 цифр" };
  }

  let sessionUserId: string | null = null;
  const result = await withDb<AuthResult>((db) => {
    const record = db.loginCodes.find((c) => c.phone === phone);
    if (!record) {
      return { ok: false, error: "Сначала запросите код подтверждения" };
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      db.loginCodes = db.loginCodes.filter((c) => c.id !== record.id);
      return { ok: false, error: "Код истёк — запросите новый" };
    }
    if (record.code !== submitted) {
      record.attemptsLeft -= 1;
      if (record.attemptsLeft <= 0) {
        db.loginCodes = db.loginCodes.filter((c) => c.id !== record.id);
        return {
          ok: false,
          error: "Неверный код, попытки закончились — запросите новый",
        };
      }
      return {
        ok: false,
        error: `Неверный код. Осталось попыток: ${record.attemptsLeft}`,
      };
    }

    const user = db.users.find((u) => u.phone === phone);
    if (user) {
      sessionUserId = user.id;
      db.loginCodes = db.loginCodes.filter((c) => c.id !== record.id);
      return { ok: true, registered: true };
    }
    // Новый номер — оставляем верифицированный код как пропуск к регистрации.
    record.verified = true;
    return { ok: true, registered: false, regToken: record.id };
  });

  if (sessionUserId) await createSession(sessionUserId);
  return result;
}

export async function completeRegistration(
  regToken: string,
  firstNameRaw: string,
  lastNameRaw: string,
  graduationYearRaw: string
): Promise<AuthResult> {
  const firstName = firstNameRaw.trim();
  const lastName = lastNameRaw.trim();
  if (firstName.length < 2 || firstName.length > 40) {
    return { ok: false, error: "Укажите имя (от 2 до 40 символов)" };
  }
  if (lastName.length < 2 || lastName.length > 40) {
    return { ok: false, error: "Укажите фамилию (от 2 до 40 символов)" };
  }
  let graduationYear: number | null = null;
  const yearRaw = graduationYearRaw.trim();
  if (yearRaw) {
    const parsed = Number(yearRaw);
    if (!Number.isInteger(parsed) || parsed < 1950 || parsed > new Date().getFullYear()) {
      return { ok: false, error: "Номер выпуска — год в диапазоне от 1950 до текущего" };
    }
    graduationYear = parsed;
  }

  let sessionUserId: string | null = null;
  const result = await withDb<AuthResult>((db) => {
    const record = db.loginCodes.find((c) => c.id === regToken && c.verified);
    if (!record || new Date(record.expiresAt).getTime() <= Date.now()) {
      return { ok: false, error: "Сессия регистрации истекла — начните заново" };
    }
    const user = {
      id: randomUUID(),
      phone: record.phone,
      firstName,
      lastName,
      graduationYear,
      isAdmin: db.users.length === 0,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.loginCodes = db.loginCodes.filter((c) => c.id !== record.id);
    sessionUserId = user.id;
    return { ok: true, registered: true };
  });

  if (sessionUserId) await createSession(sessionUserId);
  return result;
}

export async function demoLogin(role: "admin" | "member"): Promise<void> {
  const userId = await demoLoginUserId(role);
  await createSession(userId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

/* --------------------------------- profile -------------------------------- */

export async function updateProfile(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите, чтобы редактировать профиль" };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const yearRaw = String(formData.get("graduationYear") ?? "").trim();

  if (firstName.length < 2 || firstName.length > 40) {
    return { error: "Имя должно быть от 2 до 40 символов" };
  }
  if (lastName.length < 2 || lastName.length > 40) {
    return { error: "Фамилия должна быть от 2 до 40 символов" };
  }
  let graduationYear: number | null = null;
  if (yearRaw) {
    const parsed = Number(yearRaw);
    if (!Number.isInteger(parsed) || parsed < 1950 || parsed > new Date().getFullYear()) {
      return { error: "Номер выпуска — год от 1950 до текущего" };
    }
    graduationYear = parsed;
  }

  await withDb((db) => {
    const target = db.users.find((u) => u.id === user.id);
    if (!target) return;
    target.firstName = firstName;
    target.lastName = lastName;
    target.graduationYear = graduationYear;
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/* --------------------------------- events --------------------------------- */

function validateEventInput(formData: FormData, currentActive: number) {
  const title = String(formData.get("title") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const durationMin = Number(formData.get("durationMin"));
  const minPlayers = Number(formData.get("minPlayers"));
  const maxPlayers = Number(formData.get("maxPlayers"));

  if (title.length < 3 || title.length > 80) {
    return { error: "Название должно быть от 3 до 80 символов" } as const;
  }
  if (address.length < 3 || address.length > 160) {
    return { error: "Адрес должен быть от 3 до 160 символов" } as const;
  }
  const start = parseStart(startsAtRaw);
  if (Number.isNaN(start.getTime())) {
    return { error: "Укажите дату и время начала" } as const;
  }
  if (start.getTime() <= Date.now()) {
    return { error: "Дата и время должны быть в будущем" } as const;
  }
  if (
    !Number.isInteger(durationMin) ||
    durationMin < MIN_DURATION_MIN ||
    durationMin > MAX_DURATION_MIN
  ) {
    return {
      error: `Продолжительность — от ${MIN_DURATION_MIN} до ${MAX_DURATION_MIN} минут`,
    } as const;
  }
  if (!Number.isInteger(minPlayers) || minPlayers < 1 || minPlayers > 30) {
    return { error: "Минимум участников — целое число от 1 до 30" } as const;
  }
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 40) {
    return { error: "Максимум участников — целое число от 2 до 40" } as const;
  }
  if (minPlayers > maxPlayers) {
    return { error: "Минимум участников не может быть больше максимума" } as const;
  }
  if (maxPlayers < currentActive) {
    return {
      error: `Максимум не может быть меньше уже записанных (${currentActive})`,
    } as const;
  }
  if (description.length > 1000) {
    return { error: "Описание — не длиннее 1000 символов" } as const;
  }
  return {
    value: {
      title,
      address,
      description,
      startsAt: startsAtRaw,
      durationMin,
      minPlayers,
      maxPlayers,
    },
  } as const;
}

export async function createEvent(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите, чтобы создать тренировку" };
  if (!user.isAdmin) return { error: "Создавать тренировки может только админ" };

  const parsed = validateEventInput(formData, 0);
  if ("error" in parsed) return { error: parsed.error };

  const id = randomUUID();
  await withDb((db) => {
    const event: VolleyEvent = {
      id,
      ...parsed.value,
      createdBy: user.id,
      cancelled: false,
      cancelReason: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
    };
    db.events.push(event);
  });

  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function updateEvent(
  eventId: string,
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите в систему" };
  if (!user.isAdmin) return { error: "Редактировать тренировки может только админ" };

  const result = await withDb<FormResult>((db) => {
    const event = db.events.find((e) => e.id === eventId);
    if (!event) return { error: "Тренировка не найдена" };
    if (event.cancelled) return { error: "Отменённую тренировку нельзя редактировать" };
    if (eventEnd(event).getTime() <= Date.now()) {
      return { error: "Тренировка уже завершилась" };
    }
    const parsed = validateEventInput(formData, activeCount(db, eventId));
    if ("error" in parsed) return { error: parsed.error };
    Object.assign(event, parsed.value);
    return { ok: true };
  });

  if (result.ok) {
    refreshEventViews(eventId);
    redirect(`/events/${eventId}`);
  }
  return result;
}

export async function cancelEvent(eventId: string): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите в систему" };
  if (!user.isAdmin) return { error: "Отменять тренировки может только админ" };

  await withDb((db) => {
    const event = db.events.find((e) => e.id === eventId);
    if (!event || event.cancelled) return;
    event.cancelled = true;
    event.cancelReason = "organizer";
    event.cancelledAt = new Date().toISOString();
  });

  refreshEventViews(eventId);
  return { ok: true };
}

/* --------------------------------- signups -------------------------------- */

export async function joinEvent(eventId: string): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите, чтобы записаться на тренировку" };

  const result = await withDb<FormResult>((db) => {
    const event = db.events.find((e) => e.id === eventId);
    if (!event) return { error: "Тренировка не найдена" };
    if (event.cancelled) return { error: "Тренировка отменена" };
    const start = parseStart(event.startsAt);
    if (new Date() >= start) return { error: "Запись закрыта: тренировка уже началась" };
    const existing = findUserSignup(db, eventId, user.id);
    if (existing) {
      return {
        error:
          existing.status === "active"
            ? "Вы уже записаны на эту тренировку"
            : "Вы уже в резерве на эту тренировку",
      };
    }
    const hasSlot = activeCount(db, eventId) < event.maxPlayers;
    db.signups.push({
      id: randomUUID(),
      eventId,
      userId: user.id,
      status: hasSlot ? "active" : "waitlist",
      joinedAt: new Date().toISOString(),
    });
    return { ok: true };
  });

  if (result.ok) refreshEventViews(eventId);
  return result;
}

export async function leaveEvent(eventId: string): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите в систему" };

  const result = await withDb<FormResult>((db) => {
    const event = db.events.find((e) => e.id === eventId);
    if (!event) return { error: "Тренировка не найдена" };
    const signup = findUserSignup(db, eventId, user.id);
    if (!signup || signup.status !== "active") {
      return { error: "Вы не записаны на эту тренировку" };
    }
    const { waitlist } = getSignups(db, eventId);
    const block = withdrawBlockReason(event, waitlist.length);
    if (block) return { error: block };

    signup.status = "cancelled";
    const next = waitlist[0];
    if (next) next.status = "active"; // первый резервист занимает место
    return { ok: true };
  });

  if (result.ok) refreshEventViews(eventId);
  return result;
}

export async function leaveWaitlist(eventId: string): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите в систему" };

  const result = await withDb<FormResult>((db) => {
    const event = db.events.find((e) => e.id === eventId);
    if (!event) return { error: "Тренировка не найдена" };
    const signup = findUserSignup(db, eventId, user.id);
    if (!signup || signup.status !== "waitlist") {
      return { error: "Вы не в резерве на эту тренировку" };
    }
    if (new Date() >= parseStart(event.startsAt)) {
      return { error: "Тренировка уже началась" };
    }
    signup.status = "cancelled";
    return { ok: true };
  });

  if (result.ok) refreshEventViews(eventId);
  return result;
}
