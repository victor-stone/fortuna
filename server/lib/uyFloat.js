export default function parseUYUFloat(text) {
    return parseFloat(text.trim().replace('.', '').replace(',', '.')) || 0;
}
