export function statusLabel(status: string | null): string {
  switch (status) {
    case 'c':
      return 'Conforme'
    case 'nc':
      return 'Non conforme'
    case 'nt':
      return 'Non testé'
    case 'na':
      return 'Non applicable'
    default:
      return 'Non traité'
  }
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ\-_]/g, '-').toLowerCase()
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Revoking right away can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
