/**
 * composables/useDownload.js
 * Helper untuk men-download file Blob (Excel / PDF) dari API response.
 */
export function useDownload() {
  /**
   * Trigger download dari response blob axios.
   * @param {Blob} blob          - data blob dari axios ({ responseType: 'blob' })
   * @param {string} filename    - nama file yang akan di-download
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return { downloadBlob }
}
