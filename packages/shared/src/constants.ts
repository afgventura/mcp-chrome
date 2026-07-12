export const DEFAULT_SERVER_PORT = 12306;
// Fork-owned namespace prevents Chrome from launching an independently
// released upstream native bridge for this extension.
export const HOST_NAME = 'com.afgventura.chromemcp.nativehost';
export const BRIDGE_PROTOCOL_VERSION = 1;
/**
 * Stable identity for afgventura development and internal distributions.
 *
 * Chrome derives an unpacked extension's ID from this public key. Keeping the
 * public key in source makes the extension ID identical across machines and
 * profiles. This is not a private signing key.
 */
export const EXTENSION_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnzV0xkxTzXwt6aTd9RUfiN9/MzcAm9FIABXh6yXQXqMwU+QA8LcgHZcmIlX+7rFDeUskGHwAcOYa+FSmaD05ZQOZ34VPrKGXO17nq82gbe5VtcYm8iRfsRm4AHkRrade4jknsVepsd5YuPyvAFK2J34a0DYa6xjXP//2KnkF2qf6oFBxeynFE/xbop2G77WRHRgNwQN+v5+4f2W4axa7JaJsge5xZUJg3gSrs49bfX5b7o5vw6y033OMaYK5Epr8JIa2xho0+avfnQEuH7+yPRFILSJme4u5RiY6eOeRutRgB91keYFPTywXsW/dsCzV0wJkQJNRrtvtTxOosF2+IQIDAQAB';

export const EXTENSION_ID = 'gmolioeebfppjehkofcpiefglimgdbog';
