let cacheTextColor = {};

export function getTextColorForBgColor(bgColor) {
  if (cacheTextColor[bgColor]) {
    return cacheTextColor[bgColor];
  }
  let hexColor = bgColor.replace('#', '');
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  const textColor = yiq >= 128 ? '#000000' : '#FFFFFF';
  cacheTextColor[bgColor] = textColor;
  return textColor;
}
