import { Vendor, TimeSlot, VendorStatus, MenuItem } from '@/types';

export interface ParsedSlot {
  open: number; // Minutes from midnight
  close: number; // Minutes from midnight
  openDisplay: string;
  closeDisplay: string;
}

export interface ShopStatusResult {
  status: VendorStatus;
  msg: string;
  activeSlot?: ParsedSlot;
  nextSlot?: ParsedSlot;
  nextDayLabel?: string;
}

const dayNamesLong = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const dayNamesShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Parses time strings in both 12-hour (e.g., "2:30 PM", "12:15 AM") and 24-hour formats (e.g., "14:30")
 * into total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const upper = timeStr.trim().toUpperCase();
  const isPM = upper.includes('PM');
  const isAM = upper.includes('AM');

  // Strip non-numeric and non-colon characters
  const cleanTime = upper.replace(/[^0-9:]/g, '');
  const parts = cleanTime.split(':');

  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Normalizes a Firestore TimeSlot into a standard minutes-based ParsedSlot.
 */
export function parseSlot(slot: TimeSlot): ParsedSlot | null {
  if (!slot) return null;
  const openStr = slot.open || slot.startTime;
  const closeStr = slot.close || slot.endTime;

  if (!openStr || !closeStr) return null;

  return {
    open: parseTimeToMinutes(openStr),
    close: parseTimeToMinutes(closeStr),
    openDisplay: openStr,
    closeDisplay: closeStr,
  };
}

/**
 * Looks up and sorts slots for a given day index (0 = Sunday, 1 = Monday, etc.).
 */
export function getSlotsForDayIndex(operatingHours: Record<string, TimeSlot[]>, index: number): ParsedSlot[] {
  if (!operatingHours) return [];

  const longKey = dayNamesLong[index];
  const shortKey = dayNamesShort[index];

  let rawSlots: TimeSlot[] | undefined;
  for (const k of Object.keys(operatingHours)) {
    const lowerKey = k.toLowerCase();
    if (lowerKey === longKey || lowerKey === shortKey) {
      rawSlots = operatingHours[k];
      break;
    }
  }

  if (!rawSlots || !Array.isArray(rawSlots)) return [];

  return rawSlots
    .map(parseSlot)
    .filter((s): s is ParsedSlot => s !== null)
    .sort((a, b) => a.open - b.open);
}

export class VendorStatusManager {
  /**
   * Determines the current availability status of a vendor.
   * Can accept an optional reference Date for testing / timezone overrides.
   */
  static getShopStatus(vendor: Vendor, now: Date = new Date()): ShopStatusResult {
    // 1. Master Emergency Toggle Check
    // If explicitly false, shop is closed.
    if (vendor.isShopOpen === false) {
      return { status: VendorStatus.CLOSED_TEMP, msg: 'Closed for now' };
    }

    const operatingHours = vendor.operatingHours;

    // 2. Empty Schedule Fallback
    // If schedule is empty/undefined but isShopOpen is true/undefined, default to OPEN.
    const hasSchedule = operatingHours && Object.keys(operatingHours).some(day => {
      const slots = operatingHours[day];
      return Array.isArray(slots) && slots.length > 0;
    });

    if (!hasSchedule) {
      return { status: VendorStatus.OPEN, msg: 'Open' };
    }

    const currentMins = now.getHours() * 60 + now.getMinutes();
    const dayIndex = now.getDay(); // 0 (Sunday) to 6 (Saturday)

    // 4. Today's Schedule Check
    const todaySlots = getSlotsForDayIndex(operatingHours!, dayIndex);

    if (todaySlots.length > 0) {
      // OPEN: Current time is between open and close of any slot today
      const activeSlot = todaySlots.find(s => currentMins >= s.open && currentMins < s.close);
      if (activeSlot) {
        return {
          status: VendorStatus.OPEN,
          msg: `Open until ${activeSlot.closeDisplay}`,
          activeSlot,
        };
      }

      // BEFORE_OPENING: Current time is before the first slot of the day
      const firstSlot = todaySlots[0];
      if (currentMins < firstSlot.open) {
        return {
          status: VendorStatus.BEFORE_OPENING,
          msg: `Opens at ${firstSlot.openDisplay}`,
          nextSlot: firstSlot,
        };
      }

      // ON_BREAK: Current time is between two defined slots today
      for (let i = 0; i < todaySlots.length - 1; i++) {
        const currentSlot = todaySlots[i];
        const nextSlot = todaySlots[i + 1];
        if (currentMins >= currentSlot.close && currentMins < nextSlot.open) {
          return {
            status: VendorStatus.ON_BREAK,
            msg: `Opens at ${nextSlot.openDisplay}`,
            nextSlot,
          };
        }
      }
    }

    // 6. Find Next Opening: Iterate 1 to 7 days in the future to find the earliest slot
    for (let d = 1; d <= 7; d++) {
      const nextDayIndex = (dayIndex + d) % 7;
      const nextDaySlots = getSlotsForDayIndex(operatingHours!, nextDayIndex);

      if (nextDaySlots.length > 0) {
        const nextSlot = nextDaySlots[0];
        const nextDayName = dayNamesLong[nextDayIndex];
        const capDayName = nextDayName.charAt(0).toUpperCase() + nextDayName.slice(1);

        const isTomorrow = d === 1;
        const dayLabel = isTomorrow ? 'Tomorrow' : capDayName;

        const status = todaySlots.length === 0 ? VendorStatus.CLOSED_FOR_DAY : VendorStatus.AFTER_CLOSING;

        return {
          status,
          msg: `Opens ${dayLabel} at ${nextSlot.openDisplay}`,
          nextSlot,
          nextDayLabel: dayLabel,
        };
      }
    }

    // Ultimate fallback if no active schedule slots found in the next week
    return {
      status: todaySlots.length === 0 ? VendorStatus.CLOSED_FOR_DAY : VendorStatus.AFTER_CLOSING,
      msg: 'Closed',
    };
  }
}

/**
 * Determines whether a menu item is in stock, correctly handling:
 * 1. The isAvailable master toggle on the item.
 * 2. Variant-based items (price === 0 OR any option has a stock field):
 *    → At least one option must be isAvailable AND have stock (null = unlimited).
 * 3. Simple items: if inventoryEnabled && stock === 0 → out of stock.
 *
 * @param item - The MenuItem to evaluate.
 * @param inventoryEnabled - Whether the vendor has inventory tracking on (vendor.isInventory).
 * @returns true if the item can be ordered, false if out of stock or unavailable.
 */
export function isItemInStock(item: MenuItem, inventoryEnabled?: boolean): boolean {
  // 1. Master availability toggle
  if (!item.isAvailable) return false;

  // 2. Determine if the item is variant-based:
  //    - Price is 0 (price is entirely determined by customization selection), OR
  //    - Any customization option carries a stock field (non-null/undefined).
  const isVariantBased =
    item.price === 0 ||
    item.customizations?.some(group =>
      group.options.some(opt => opt.stock !== undefined && opt.stock !== null)
    );

  if (isVariantBased) {
    // At least one option across ALL groups must be available and have stock.
    const hasAvailableVariant = item.customizations?.some(group =>
      group.options.some(
        opt =>
          opt.isAvailable !== false &&
          (!inventoryEnabled || opt.stock === null || opt.stock === undefined || opt.stock > 0)
      )
    );
    // If there are no customizations at all (edge case) fall through to simple check.
    if (item.customizations && item.customizations.length > 0) {
      return !!hasAvailableVariant;
    }
  }

  // 3. Simple item stock check.
  if (inventoryEnabled && item.stock !== null && item.stock !== undefined && item.stock === 0) {
    return false;
  }
  return true;
}
