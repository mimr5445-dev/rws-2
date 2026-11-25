/**
 * PCG32 مبذور بالكامل: كل الأرقام عبر BigInt لتطابق تام بين المتصفح وNode.
 * لا يوجد أي مصدر عشوائي آخر في core (S1.4).
 */
const MASK_64 = (1n << 64n) - 1n;
const MULTIPLIER = 6364136223846793005n;
const DEFAULT_STREAM = 54n;

export class Pcg32 {
  private state: bigint;
  private readonly inc: bigint;

  constructor(seed: number | bigint, stream: number | bigint = DEFAULT_STREAM) {
    const seedValue = BigInt(seed);
    if (seedValue < 0n) throw new Error('البذرة يجب أن تكون غير سالبة');
    this.inc = ((BigInt(stream) << 1n) | 1n) & MASK_64;
    this.state = 0n;
    this.nextUint32();
    this.state = (this.state + seedValue) & MASK_64;
    this.nextUint32();
  }

  /** القيمة التالية كعدد صحيح 32-bit غير سالب. */
  nextUint32(): number {
    const oldState = this.state;
    this.state = (oldState * MULTIPLIER + this.inc) & MASK_64;
    const xorshifted = (((oldState >> 18n) ^ oldState) >> 27n) & 0xffffffffn;
    const rotation = oldState >> 59n;
    const rotated =
      ((xorshifted >> rotation) | (xorshifted << ((32n - rotation) & 31n))) & 0xffffffffn;
    return Number(rotated);
  }

  /** عدد عشري في [0, 1). */
  nextFloat(): number {
    return this.nextUint32() / 4294967296;
  }

  /** عدد صحيح في [min, maxExclusive). */
  nextInt(min: number, maxExclusive: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(maxExclusive)) {
      throw new Error('nextInt يحتاج أعداداً صحيحة');
    }
    if (maxExclusive <= min) throw new Error('المدى غير صالح');
    return min + (this.nextUint32() % (maxExclusive - min));
  }

  /** تدفق فرعي مستقل حتمياً من البذرة نفسها. */
  fork(streamId: number | bigint): Pcg32 {
    const derived = (BigInt(streamId) << 32n) ^ BigInt(this.nextUint32());
    return new Pcg32(derived, BigInt(streamId));
  }

  /** لحظة داخلية للتشخيص فقط؛ لا تُستخدم في الحساب. */
  get snapshot(): { state: bigint; inc: bigint } {
    return { state: this.state, inc: this.inc };
  }
}

export function createRng(seed: number | bigint, stream: number | bigint = DEFAULT_STREAM): Pcg32 {
  return new Pcg32(seed, stream);
}
