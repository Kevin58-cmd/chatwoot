export function uuid(n = 4) {
  let result = '';
  for (let i = 0; i < n; i += 1) {
    const randomNumber = Math.floor(Math.random() * 26);
    const randomChar = String.fromCharCode(65 + randomNumber);
    result += randomChar;
  }
  return result;
}
