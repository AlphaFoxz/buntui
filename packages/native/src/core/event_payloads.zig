// Binary event payload definitions for the FFI event bus.
// Must stay in sync with TypeScript counterparts in events/types.ts.

// Modifier bitmask (shared by KeyboardEvent, MouseEvent, WheelEvent)
pub const MOD_SHIFT: u8 = 0x01;
pub const MOD_CTRL: u8 = 0x02;
pub const MOD_ALT: u8 = 0x04;
pub const MOD_META: u8 = 0x08;
pub const MOD_REPEAT: u8 = 0x10;

// Mouse presence flags
pub const HAS_BUTTON: u8 = 0x01;
pub const HAS_BUTTONS: u8 = 0x02;

// Mouse action flag (flags byte bit 4)
pub const IS_RELEASE: u8 = 0x10;

// MouseEvent payload — 8 bytes fixed
pub const MousePayload = extern struct {
    modifiers: u8,
    flags: u8,
    button: u8,
    buttons: u8,
    x: u16,
    y: u16,
};

// WheelEvent payload — 9 bytes fixed (extends MousePayload)
pub const WheelPayload = extern struct {
    modifiers: u8,
    flags: u8,
    button: u8,
    buttons: u8,
    x: u16,
    y: u16,
    wheel_delta_y: i8,
};

// TermResizeEvent payload — 4 bytes fixed
pub const TermResizePayload = extern struct {
    rows: u16,
    cols: u16,
};
