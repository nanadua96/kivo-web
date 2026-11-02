export type AuthActionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };
