/**
 * This is a frontend-only demo: agency documents are never actually uploaded
 * anywhere (see AuthPage's registration wizard). To make the System Admin's
 * document review page previewable/testable, we generate simple placeholder
 * "scanned document" images and one tiny real PDF entirely client-side
 * instead of shipping binary fixture files.
 */

function svgDocumentDataUrl(title: string, subtitle: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="#f4f1ea" />
    <rect x="24" y="24" width="752" height="952" fill="#ffffff" stroke="#d8d2c4" stroke-width="2" />
    <rect x="24" y="24" width="752" height="120" fill="${accent}" />
    <text x="56" y="90" font-family="Georgia, serif" font-size="34" fill="#ffffff">${title}</text>
    <text x="56" y="122" font-family="Arial, sans-serif" font-size="16" fill="#ffffffcc">${subtitle}</text>
    ${Array.from({ length: 14 })
      .map((_, i) => `<rect x="56" y="${190 + i * 44}" width="${i % 3 === 0 ? 500 : 680}" height="14" rx="3" fill="#e5e0d4" />`)
      .join('')}
    <rect x="56" y="860" width="220" height="80" fill="none" stroke="#b8b2a0" stroke-width="2" stroke-dasharray="6 6" />
    <text x="96" y="905" font-family="Arial, sans-serif" font-size="14" fill="#9a9484">OFFICIAL SEAL</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const MOCK_DOCUMENT_IMAGES = {
  registrationCertificate: svgDocumentDataUrl('Certificate of Registration', 'Metro Search & Rescue', '#3b5f52'),
  adminIdMetro: svgDocumentDataUrl("Government-Issued ID", 'Agency Admin — Metro SAR', '#3b4f6b'),
  proofOfAddressMetro: svgDocumentDataUrl('Proof of Address', 'Metro Search & Rescue', '#6b5a3b'),
  coastalAdminId: svgDocumentDataUrl('Government-Issued ID', 'Agency Admin — Coastal ER', '#3b4f6b'),
  coastalRegistration: svgDocumentDataUrl('Certificate of Registration', 'Coastal Emergency Response', '#3b5f52'),
  highlandRegistration: svgDocumentDataUrl('Certificate of Registration', 'Highland County Fire & Rescue', '#3b5f52'),
  highlandAdminId: svgDocumentDataUrl('Government-Issued ID', 'Agency Admin — Highland Fire', '#3b4f6b'),
  highlandProofOfAddress: svgDocumentDataUrl('Proof of Address', 'Highland County Fire & Rescue', '#6b5a3b'),
} as const

/** A tiny, hand-built but valid single-page PDF — lets the PDF preview path be exercised for real. */
export const MOCK_ACCREDITATION_PDF =
  'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNDAwIDI2MF0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggMTQ2Pj5zdHJlYW0KQlQgL0YxIDE2IFRmIDI0IDIxMCBUZCAoUmVzY3VlRXllIERlbW8gRG9jdW1lbnQpIFRqIDAgLTI4IFRkIChDZXJ0aWZpY2F0ZSBvZiBSZWdpc3RyYXRpb24pIFRqIDAgLTI4IFRkIChUaGlzIGlzIGEgc2FtcGxlIHZlcmlmaWNhdGlvbiBmaWxlLikgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj5lbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTIgMDAwMDAgbiAKMDAwMDAwMDEwMSAwMDAwMCBuIAowMDAwMDAwMjExIDAwMDAwIG4gCjAwMDAwMDA0MDQgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ2NQolJUVPRg=='
