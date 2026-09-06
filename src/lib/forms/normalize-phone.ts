/**
 * フォームで入力された電話番号にハイフンが無い場合、ハイフン区切りに整形する
 * (問い合わせフォームは全角/ハイフン無し等ばらつきがちなため)。
 * 日本の電話番号は市外局番の桁数が地域によって異なり(例: 03は2桁、0466は4桁)、
 * 厳密な正しい桁分けには市外局番の一覧表が必要になる。それは過剰なため、最も件数が
 * 多い携帯電話(11桁: 090/080/070/060等)は3-4-4、それ以外の10桁の数字は3-3-4で
 * 割り切って整形する(2桁市外局番の固定電話等は完全には正しく分割されない)。
 * 既にハイフンや「+」等が含まれる場合、桁数がどちらにも合わない場合は、
 * 誤った書き換えを避けるため入力をそのまま返す。
 */
export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (!/^[0-9０-９]+$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return trimmed;
}
