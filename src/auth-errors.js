export function authErrorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'האימייל או הסיסמה שגויים. נסו שוב.',
    'auth/wrong-password': 'האימייל או הסיסמה שגויים. נסו שוב.',
    'auth/user-not-found': 'האימייל או הסיסמה שגויים. נסו שוב.',
    'auth/invalid-email': 'כתובת האימייל אינה תקינה.',
    'auth/email-already-in-use': 'לא ניתן להירשם עם הכתובת הזו. נסו להיכנס או לאפס את הסיסמה.',
    'auth/weak-password': 'בחרו סיסמה חזקה יותר, עם לפחות 6 תווים.',
    'auth/password-does-not-meet-requirements': 'הסיסמה אינה עומדת בדרישות. נסו סיסמה ארוכה יותר עם אותיות, מספרים וסימנים.',
    'auth/too-many-requests': 'בוצעו יותר מדי ניסיונות. המתינו מעט ונסו שוב.',
    'auth/network-request-failed': 'לא ניתן להתחבר. בדקו את חיבור האינטרנט ונסו שוב.',
    'auth/popup-blocked': 'הדפדפן חסם את חלון הכניסה. אפשרו חלונות קופצים לאתר ונסו שוב.',
    'auth/popup-closed-by-user': 'חלון הכניסה נסגר לפני שהכניסה הושלמה.',
    'auth/cancelled-popup-request': 'כבר נפתח חלון כניסה. המשיכו בו או נסו שוב.',
    'auth/account-exists-with-different-credential': 'כבר קיים חשבון עם האימייל הזה. היכנסו בשיטה שבה נרשמתם.',
    'auth/user-disabled': 'החשבון אינו זמין. פנו למנהל המחנה.',
    'auth/operation-not-allowed': 'שיטת הכניסה הזו אינה זמינה כרגע. פנו למנהל המחנה.',
    'auth/unauthorized-domain': 'הכניסה מהכתובת הזו אינה זמינה כרגע. פנו למנהל המחנה.',
    'auth/web-storage-unsupported': 'הדפדפן אינו מאפשר לשמור את החיבור. אפשרו אחסון עבור האתר ונסו שוב.',
  };
  return messages[error?.code] ?? 'הכניסה לא הושלמה. נסו שוב בעוד רגע.';
}
