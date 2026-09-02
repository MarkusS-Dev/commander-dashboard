import "server-only";

type OtpEntry = {
	code: string;
	expiresAt: number;
};

const otpStore = new Map<string, OtpEntry>();

export function setOtp(
	email: string,
	code: string,
	ttlMinutes: number
) {
	otpStore.set(email, {
		code,
		expiresAt: Date.now() + ttlMinutes * 60 * 1000,
	});
}

export function consumeOtp(email: string, code: string): boolean {
	const entry = otpStore.get(email);

	if (!entry)
		return false;

	if (Date.now() > entry.expiresAt) {
		otpStore.delete(email);
		return false;
	}

	if (entry.code !== code)
		return false;

	otpStore.delete(email);
	return true;
}
