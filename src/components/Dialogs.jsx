import { CombatStats } from './CombatStats.jsx';
import React from 'react';
import { creatureCard, creatureModes, localTheme } from '../creatures.js';
import { Creature } from './Creature.jsx';
import { AppMark, ExternalLink, Modal } from './UI.jsx';

const rarityLabels = { epic: 'אפי', legendary: 'אגדי', mythical: 'מיתי' };

export function TermsDialog({ close }) {
  return (
    <Modal title="תנאי שימוש והפצה" eyebrow="שימוש אחראי וכיבוד זכויות יוצרים" onClose={close}>
      <div className="terms-content">
        <p className="terms-notice">
          תנאים אלה מסבירים את מקורות התוכן והרישיונות החלים עליו. אין בהם הבטחה משפטית גורפת; יש
          לפעול לפי הרישיון של כל רכיב.
        </p>
        <section>
          <h3>מטרת האפליקציה</h3>
          <p>
            האפליקציה נועדה לתרגול אישי. היא אינה מבחן רשמי ואינה קשורה לגוף בוחן, להוצאה לאור ואינה
            מאושרת או ממומנת על ידם. אין התחייבות לדיוק השאלות, הפתרונות או התוצאות.
          </p>
        </section>
        <section>
          <h3>יצורי SRD וייחוס</h3>
          <p>
            בעולם ״יצורי SRD״, שמות היצורים מבוססים על SRD 5.2.1. העולמות ״יצורים מיתולוגיים״, ״בעלי
            חיים״ ו״עולם הקוביות״ מציגים גם שמות כלליים מהפולקלור ומהטבע. התרגומים לעברית, דרגות החברות והנדירות
            במשחק הם התאמות עבור האפליקציה; האיורים הם ייצוגים סמליים נפרדים ואינם איורי SRD רשמיים.
          </p>
          <p dir="ltr">
            This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by
            Wizards of the Coast LLC, available at{' '}
            <ExternalLink href="https://www.dndbeyond.com/srd">
              https://www.dndbeyond.com/srd
            </ExternalLink>
            . The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International
            License, available at{' '}
            <ExternalLink href="https://creativecommons.org/licenses/by/4.0/legalcode">
              https://creativecommons.org/licenses/by/4.0/legalcode
            </ExternalLink>
            .
          </p>
        </section>
        <section>
          <h3>איורים בנחלת הכלל</h3>
          <p>
            האיורים וסמל העטלף נלקחו מחבילת{' '}
            <ExternalLink href="https://kenney-assets.itch.io/tiny-dungeon">
              Tiny Dungeon של Kenney
            </ExternalLink>{' '}
            ומחבילת{' '}
            <ExternalLink href="https://luizmelo.itch.io/monsters-creatures-fantasy">
              Monsters Creatures Fantasy של LuizMelo
            </ExternalLink>
            , שפורסמו תחת{' '}
            <ExternalLink href="https://creativecommons.org/publicdomain/zero/1.0/">
              CC0 1.0
            </ExternalLink>
            . נוספו להם איורים מחבילות{' '}
            <ExternalLink href="https://pulsarcp.itch.io/free-pixel-art-animals-birds">
              החיות
            </ExternalLink>{' '}
            ו<ExternalLink href="https://pulsarcp.itch.io/fantasy-creatures">הפנטזיה</ExternalLink>{' '}
            של PulsarCP ומ
            <ExternalLink href="https://clintbellanger.itch.io/tiny-creatures">
              ־Tiny Creatures של Clint Bellanger
            </ExternalLink>
            , גם הן ב־CC0. נוספו איורים מחבילת{' '}
            <ExternalLink href="https://hexany-ives.itch.io/hexanys-monster-menagerie">
              Hexany’s Monster Menagerie
            </ExternalLink>{' '}
            של Hexany Ives, גם היא ב־CC0. איורי עולם הקוביות הם מתוך חבילות{' '}
            <ExternalLink href="https://colefoster.itch.io/voxel-dungeon-pack">Voxel Dungeon</ExternalLink>{' '}
            ו<ExternalLink href="https://colefoster.itch.io/voxel-forest-ruins-pack">Voxel Forest Ruins</ExternalLink>{' '}
            של Cole Foster, ב־CC0. אלו עיצובים עצמאיים; אין קשר ל־Mojang או ל־Microsoft ואין שימוש באיורי Minecraft. איורים נוספים מאת{' '}
            <ExternalLink href="https://gordyh.itch.io/public-domain-art-pack-inktober-2024">
              Gordy Higgins
            </ExternalLink>{' '}
            הוקדשו במפורש לנחלת הכלל על ידי היוצר. נוספו איורי CC0 מאתר{' '}
            <ExternalLink href="https://openclipart.org/share">Openclipart</ExternalLink>
            , עם קישורים ליוצרים במפרט המקורות. איור סוס האש מסומן על ידי היוצר כאמנות בסיוע
            בינה מלאכותית. חבילות PulsarCP מסומנות על ידי היוצר כגרפיקה
            בסיוע בינה מלאכותית. בוצעו חיתוך מסגרות ושינויי גודל.{' '}
            <ExternalLink href="./licenses/ATTRIBUTION.txt">פרטי המקורות והרישיונות</ExternalLink>.
          </p>
        </section>
        <section>
          <h3>שאלות וחומרי לימוד</h3>
          <p>
            האימונים משתמשים בשאלות חשבון שנוצרות מתבניות ובסיפורים ושאלות הבנת הנקרא שנכתבו עבור
            האפליקציה. תכני החוברת אינם כלולים בגרסה זו. התכנים אינם שאלות מבחן רשמיות, ועשויות
            להיות בהם טעויות. יצירת תוכן חדש אינה כשלעצמה הבטחה להיעדר זכויות צד שלישי.
          </p>
        </section>
        <section>
          <h3>העתקה והפצה</h3>
          <p>
            חומר ה־SRD ניתן לשימוש ולהפצה בהתאם ל־CC BY 4.0, לרבות ייחוס וציון שינויים. איורי CC0
            זמינים לשימוש, לשינוי ולהפצה בהתאם להקדשת CC0. אין בתנאים אלה הגבלה נוספת על הזכויות
            המוענקות ברישיונות אלה. אין להציג מצג של חסות רשמית. זמינות קוד המקור לציבור אינה
            כשלעצמה רישיון לקוד או לנכסים הנלווים. רישיונות של ספריות צד שלישי ממשיכים לחול עליהן.
          </p>
        </section>
        <section>
          <h3>לפני פרסום או שימוש מסחרי</h3>
          <p>
            יש לבדוק בנפרד את הרשאות השימוש בקוד, במאגר השאלות ובכל נכס חזותי. כאשר ההרשאה אינה
            ברורה, יש להשיג אישור או להחליף את התוכן בתוכן מקורי או מורשה. התקנת האפליקציה במסך הבית
            אינה משנה את מעמד הזכויות.
          </p>
        </section>
        <section>
          <h3>דיווח על בעיה בזכויות</h3>
          <p>
            ניתן לפנות למתחזקי הפרויקט באמצעות{' '}
            <ExternalLink href="https://github.com/ShyAlon/test-prep/issues">
              דיווח במאגר הפרויקט
            </ExternalLink>
            , עם זיהוי התוכן והבעיה. הדיווח ציבורי — אין לצרף פרטים אישיים או מסמכים חסויים.
          </p>
        </section>
        <p className="terms-date">
          עודכן: 24 בנובמבר 2026. הנוסח הוא מידע כללי ואינו תחליף לבדיקת זכויות ולייעוץ משפטי מותאם.
          אין בו כדי לגרוע מזכויות שאינן ניתנות להתניה לפי דין.
        </p>
      </div>
    </Modal>
  );
}

const exampleTheme = {
  version: 1,
  id: 'my-world',
  name: 'העולם שלי',
  description: 'חברים חדשים לאימון',
  avatar: 'friend',
  companion: 'friend',
  testImages: {
    incomplete: 'images/test-closed.png',
    completed: 'images/test-open.png',
  },
  creatures: [{
    id: 'friend', name: 'חבר', english: 'Friend',
    color: 'grass', rarity: 'standard', image: 'images/friend.png',
    element: 'grass', attack: 25, defense: 15, health: 100,
  }],
};

export function HelpDialog({ close }) {
  return (
    <Modal title="איך מתאמנים?" eyebrow="כל מאמן מתחיל בצעד קטן" onClose={close}>
      <ol className="help-steps">
        <li>
          <h3>בוחרים אימון</h3>
          <p>
            במסך הבית בוחרים את מספר השאלות ב״אימון מתחדש״ ולוחצים על ״לאימון״. האימון משלב שאלות
            חשבון עם מספרים משתנים וסיפורים מקוריים עם שאלות הבנת הנקרא. אפשר גם לבחור אחד מחמשת המבחנים הקבועים שמתחתיו. אחרי סיום מבחן, הכרטיס שלו יסומן כ״הושלם״ ותמונת הרקע תשתנה.
          </p>
        </li>
        <li>
          <h3>עונים ומתקדמים</h3>
          <p>
            קוראים את השאלה ואת קטע הקריאה, אם יש, ובוחרים תשובה. לוחצים על ״בדיקת תשובה״ בסרגל
            התחתון כדי לראות את התוצאה. אחר כך לוחצים על ״לשאלה הבאה״. בשאלה האחרונה עוברים לתוצאות
            האימון.
          </p>
        </li>
        <li>
          <h3>חוזרים ובודקים</h3>
          <p>
            ״לשאלה הקודמת״ מחזיר לשאלות שכבר ראיתם. תשובות שנבדקו נשמרות ואי אפשר לשנות אותן.
            כשמופיע כפתור הסבר, אפשר לפתוח אותו כדי להבין את הפתרון. בסיום, בוחרים אימון מתוך
            ״האימונים שלי״ במסך הבית כדי לעיין בתשובות ובהסברים.
          </p>
        </li>
      </ol>
      <section className="help-mode-note">
        <h3>איך מייבאים ערכת נושא?</h3>
        <p>פותחים את תפריט האווטאר בסרגל העליון, בוחרים ״העלאת ערכת נושא״ ובוחרים קובץ ZIP של ערכה (עד 3MB). אין צורך לחלץ אותו. הקובץ והתמונות נבדקים, ולאחר השמירה העולם החדש נבחר אוטומטית.</p>
        <p>הערכה נשמרת רק בדפדפן ובמכשיר הזה ואינה נשלחת לשרת. העלאה חדשה מחליפה את הערכה שהועלתה קודם; ההתקדמות במבחנים נשמרת. לאחר קבלת גרסה מעודכנת של ערכה, מייבאים מחדש את ה־ZIP. אם מוצגת שגיאה, הערכה הקודמת נשארת זמינה.</p>
        <details className="theme-format">
          <summary>מבנה קובץ ה־ZIP ויצירת ערכה משלכם</summary>
          <p>יוצרים את הקבצים הבאים ומכווצים את theme.json ואת תיקיית images יחד. הקובץ theme.json חייב להיות בשורש ה־ZIP, ללא תיקייה עוטפת.</p>
          <pre dir="ltr"><code>{`my-theme.zip
├── theme.json
└── images/
    ├── friend.png
    ├── test-closed.png
    └── test-open.png`}</code></pre>
          <p>דוגמה מלאה לתוכן theme.json (שומרים בקידוד UTF-8):</p>
          <pre dir="ltr"><code>{JSON.stringify(exampleTheme, null, 2)}</code></pre>
          <p>מחליפים את השמות ואת התמונות ומקפידים שהנתיבים בקובץ יתאימו בדיוק לשמות בתוך ה־ZIP. כל מזהה id חייב להיות ייחודי ולהכיל רק אותיות אנגליות קטנות, ספרות ומקפים. avatar ו־companion מצביעים על מזהים מתוך creatures.</p>
          <p>testImages הוא שדה רשות: incomplete היא תמונת מבחן שטרם הושלם ו־completed היא התמונה לאחר סיומו. אם משמיטים אותו, יוצגו תמונות היצורים של העולם.</p>
          <p>שדות הקרב element, attack, defense ו־health הם רשות: לערכות ישנות הם יוקצו אוטומטית. element משתמש באותם שמות יסודות כמו color. התקפה והגנה הן מספרים שלמים 1–100, ובריאות 10–500. אפשר להגדיר אותם גם בתוך evolution.</p>
          <p>color יכול להיות grass, fire, water, air, electric, psychic, earth או fairy. rarity יכול להיות standard, epic, legendary או mythical. אפשר להוסיף יצורים למערך creatures; התמונה בשדה image היא חובה, ו־animation הוא נתיב רשות לתמונה מונפשת.</p>
          <p>משתמשים בתמונות PNG, WebP, GIF או JPEG, בגודל עד 2048×2048. גודל ה־ZIP וגם סך הקבצים לאחר חילוץ מוגבלים ל־3MB, עם עד 200 יצורים ו־450 קבצים ותיקיות. כל התמונות חייבות להיות בתוך ה־ZIP; קישורי אינטרנט, SVG וקוד אינם נתמכים.</p>
        </details>
      </section>
      <section className="help-mode-note"><h3>אוספים חברים ויוצאים לקרב</h3><p>רק תשובה נכונה מצרפת יצור לצוות האימון. לכל יצור יסוד, התקפה, הגנה ובריאות. ככל שעונים נכון מהר יותר, היצור מתחזק — עד 50% תוספת, בלי להפחית מכוח הבסיס כשעונים לאט. לשאלת קריאה יש חלון זמן ארוך יותר.</p><p>בסוף האימון, הצוות פוגש מספר שווה של יריבים. אפשר לתקוף, להתגונן ולהתרפא מעט, לבחור משחק אוטומטי או לסיים במהירות. אפשר גם לדלג על הקרב לאחר אישור. הקרב אינו משנה את הציון או מוחק חברים מהאוסף.</p><p>יתרונות היסודות: אש ← טבע ← אדמה ← חשמל ← מים ← אוויר ← מחשבה ← קסם ← אש. כל יסוד חזק נגד הבא אחריו וחלש מול הקודם. אפשר להשתיק צלילים בסרגל העליון.</p></section>
      <p className="help-mode-note">
        אפשר לבחור עולם דרך תפריט האווטאר בסרגל העליון: יצורי SRD, יצורים מיתולוגיים, בעלי חיים או עולם הקוביות.
        לכל עולם אוסף משלו, והבחירה נשמרת בחשבון בדפדפן הזה.
      </p>
      <aside className="help-tip">
        <strong>אפשר להתאמן בקצב שלכם</strong>
        <p>
          לחצו על היצור שליד השאלה כדי לקבל רמז, או על ״הגדלה״ בסרגל העליון כדי להגדיל את הטקסט.
          ״שמירה והפסקה״ מחזירה למסך הבית; כדי להמשיך בוחרים ״ממשיכים את…״ באותו חשבון ובאותו דפדפן.
        </p>
      </aside>
    </Modal>
  );
}

export function Backpack({ collection, collectionStats = {}, close, mode = 'srd' }) {
  const plural = mode === localTheme?.mode ? localTheme.manifest.plural ?? 'יצורים' : 'יצורים';
  const catches = Object.entries(collection).filter(([id]) => creatureCard(id).mode === mode);
  return (
    <Modal
      title={`תיק ה${plural}`}
      eyebrow={`אוסף ה${plural} שלי · ${creatureModes[mode].name}`}
      subtitle={`${catches.length} סוגי ${plural} באוסף`}
      onClose={close}
      className="backpack"
      headerClassName="backpack-header"
      closeLabel="סגירה"
    >
      {catches.length === 0 ? (
        <p className="backpack-empty">
          התיק עדיין ריק. ענו נכון כדי לתפוס את היצור שמופיע ליד השאלה!
        </p>
      ) : (
        <ul className="creature-cards">
          {catches.map(([id, count]) => (
            <CollectionCard key={id} id={id} count={count} recruit={collectionStats[id]} />
          ))}
        </ul>
      )}
    </Modal>
  );
}

function CollectionCard({ id, count, recruit }) {
  const card = creatureCard(id, count);
  return (
    <li className={`creature-card card-${card.color} rarity-${card.rarity}`}>
      <div className="card-header">
        <strong>{card.name}</strong>
        <AppMark theme={card.mode === localTheme?.mode ? localTheme : null} />
      </div>
      <div className="card-art">
        {rarityLabels[card.rarity] && (
          <span className="rarity-badge">✦ {rarityLabels[card.rarity]}</span>
        )}
        <Creature id={card.id} count={count} animated={false} />
      </div>
      <CombatStats creature={recruit ?? card} compact />
      {recruit?.speedBonus > 0 && <small className="collection-speed-bonus">⚡ בונוס המפגש החזק ביותר: +{recruit.speedBonus}%</small>}
      <div className="card-caption">
        <span dir="ltr">{card.number ? `#${String(card.number).padStart(3, '0')}` : card.english}</span>
        <span>{count} תפיסות</span>
      </div>
      <p>
        {card.canEvolve ? (card.evolved ? <>✦ התפתח מ־<bdi>{card.baseName}</bdi></> : 'עוד תפיסה אחת להתפתחות!') : card.image?.startsWith('data:') ? 'ללא התפתחות' : card.experienced ? (
          <>
            ✦ חבר ותיק: <bdi>{card.name}</bdi>
          </>
        ) : (
          'עוד מפגש אחד לדרגת חבר ותיק!'
        )}
      </p>
    </li>
  );
}
