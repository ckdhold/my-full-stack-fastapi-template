export type MenuTitleFields = {
  title_zh: string
  title_en: string
}

export function resolveMenuTitle(
  menu: MenuTitleFields,
  language: string,
): string {
  return language.startsWith("zh") ? menu.title_zh : menu.title_en
}
