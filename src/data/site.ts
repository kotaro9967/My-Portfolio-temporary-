/**
 * サイトの掲載内容はすべてこのファイルに集約しています。
 * 文言の修正・実績の追加はここだけ編集すれば反映されます。
 */

export const site = {
  name: 'Kotaro Ozawa',
  nameJa: '小澤 虎汰朗',
  tagline: 'PORTFOLIO',
  title: '小澤虎汰朗 | ポートフォリオ',
  description:
    '学生フリーランスとして中小企業向けにホームページ制作を行っています。企画からデザイン、開発、運用まで一気通貫でサポートします。',
  email: 'k.ozawa.hp@gmail.com',
  emailLabel: 'k.ozawa.hp@gmail.com',
  copyright: '© 2026 Kotaro Ozawa Portfolio.',
} as const;

export const nav = [
  { label: 'PROFILE', href: '/#profile' },
  { label: 'SKILLS', href: '/#skills' },
  { label: 'WORKS', href: '/works' },
  { label: 'BLOG', href: '/blog' },
  { label: 'NEWS', href: '/news' },
] as const;

export const hero = {
  /**
   * ヒーローは画像の重ね合わせで構成されています。
   * 位置・サイズはキャンバス(1284 x 825)に対する % で指定しているため、
   * 画面幅が変わっても比率を保ったまま拡大縮小します。
   */
  blueprint: {
    src: 'hero_blueprint',
    alt: 'ポートフォリオサイトの構成を描いた設計図風のイラスト',
    width: 1672,
    height: 941,
    left: -0.16,
    top: -6.91,
    width_pct: 100,
    height_pct: 97.82,
  },
  /** 手描きロゴ。不要なものは削除して構いません（1つ目が h1 になります） */
  wordmarks: [
  { left: 65.81, top: 67.52, width_pct: 41.74, height_pct: 12.12, primary: true },
  ],
  wordmarkSrc: 'wordmark_kotaro',
  wordmarkAlt: 'Kotaro Ozawa',
} as const;

export const profile = {
  intro: '学生目線の発想と最新Web技術で、 御社の魅力を若者へ届ける。',
  body: '学生フリーランスとして主に中小企業を対象にホームページ制作活動をしています。今まで大学の課外活動で10社以上の企業のデジタル化やDXに携わってきました。具体的には、HP制作・基幹システム導入・PR動画制作です。その知見を生かし、より多くの企業に若者に刺さるHPをご提供できるよう精進してまいります。',
  items: [
    { icon: 'icon_user.png', label: 'Name', value: ['小澤 虎汰朗'] },
    { icon: 'icon_edit_role.png', label: 'Role', value: ['Webデザイナー / 学生'] },
    { icon: 'icon_location.png', label: 'Location', value: ['Tokyo, Japan'] },
    {
      icon: 'icon_code.png',
      label: 'Skills',
      value: [
        'HTML / CSS / JS / TS / C# /',
        'Python / SQL / PostgreSQL / Azure',
        'などWeb制作、データ解析、システム系',
      ],
    },
    {
      icon: 'icon_heart.png',
      label: 'Interest',
      value: ['デザイン / プログラミング /', 'データ解析 / 筋トレ'],
    },
    {
      icon: 'icon_message.png',
      label: 'Message',
      value: ['一つひとつの出会いを大切に、', '丁寧に取り組みます。'],
    },
  ],
  journey: [
    {
      year: '2024',
      title: '東京理科大学DX俱楽部を設立し、基幹システム開発を開始',
      body: '大学で線形代数・微積・統計学を学びつつ、独学でプログラミングをスタート。立ち上げたサークルでは副代表として、中小企業の基幹システム開発・運用にも携わる。',
    },
    {
      year: '2025',
      title: 'AI・データサイエンスからWeb制作まで',
      body: '大学でデータサイエンスやAIについて学びながら、活動の幅をWebやDX領域にも拡大。IT企業の採用ページ制作や、中小企業向けのPR動画制作など、企業の魅力を発信する仕事にも取り組む。',
    },
    {
      year: '2026',
      now: true,
      title: '学生ならではの視点で、Web制作を仕事に',
      body: '中小企業向けのHP制作を個人でも本格的にスタート。新しい技術を取り入れながら、就活生・若者ならではの視点を活かして、「若い世代にも伝わる」Webサイトづくりに取り組んでいる。',
    },
  ],
} as const;

export const skills = {
  lead: '企画からデザイン、開発、運用まで一気通貫でサポートします。CMSを用いてご自身で自走できるまで伴走いたします。',
  items: [
    {
      icon: 'icon_edit_role.png',
      title: ['Design', 'UI / UX'],
      text: 'ユーザー体験を重視した直感的で美しいデザインを設計。',
      detail: 'Figmaで設計し、そのまま実装まで一貫対応。ワイヤーから初稿までスピード感を持って進めます。',
      tags: ['Figma', 'Claude Design'],
    },
    {
      icon: 'icon_code.png',
      title: ['Frontend', 'Development'],
      text: 'モダンなコーディングで最適なサイトを構築。',
      detail: '表示速度と保守性を意識し、スマートフォンでも快適に閲覧できるサイトを実装します。',
      tags: ['HTML', 'CSS', 'JS', 'TS', 'React'],
    },
    {
      icon: 'icon_cube.png',
      title: ['CMS'],
      text: 'microCMSで更新しやすいサイトを実現。',
      detail: '公開後もお客様自身で情報を更新できるよう、入力項目と運用手順を分かりやすく設計します。',
      tags: ['microCMS'],
    },
    {
      icon: 'icon_search.png',
      title: ['SEO / Performance'],
      text: '検索上位表示を意識した設計で集客力を高めます。',
      detail: '検索意図・構造・表示速度・計測環境を整え、継続的に改善できる基盤を作ります。',
      tags: ['Google', 'Analytics'],
    },
    {
      icon: 'icon_users.png',
      title: ['Recruitment Support'],
      text: '採用に強いコンテンツ設計で成果につながるサイトを。',
      detail: '学生・就活生の目線を活かし、仕事内容や会社の魅力が若い世代へ伝わる導線を設計します。',
      tags: ['LP', '採用サイト'],
    },
    {
      icon: 'icon_headset.png',
      title: ['Maintenance', '& Support'],
      text: '公開後も安心のサポートで長く使えるサイトに。',
      detail: '更新方法の共有から改善提案まで、公開後も無理なくサイトを育てられるよう伴走します。',
      tags: ['改善提案', '運用サポート'],
    },
  ],
} as const;

export const works = {
  lead: '現在掲載している内容は参考用のサンプルです。お客様から受託・納品した制作実績ではありません。',
} as const;

export const news = {
  lead: '活動内容やお知らせ、制作の裏側などを発信しています。',
} as const;

export const blog = {
  lead: 'ホームページ制作・集客・運用に役立つ情報を、分かりやすく発信します。',
} as const;

export const contact = {
  lead: 'ご相談・お見積りは無料です。まずはお気軽にご連絡ください。',
  links: [
    { icon: 'icon_mail.png', label: site.emailLabel, href: `mailto:${site.email}` },
    {
      icon: 'icon_linkedin.png',
      label: 'Kotaro Ozawa',
      href: 'https://www.linkedin.com/in/kotaro-ozawa-5b557b3ab/',
    },
  ],
} as const;
