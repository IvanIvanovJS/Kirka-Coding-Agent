const exportAsHtml = (template, fileName) => {
    const blob = new Blob([template], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const aTag = document.createElement('a');
    aTag.href = url;
    aTag.download = fileName;

    document.body.appendChild(aTag);
    aTag.click();

    document.body.removeChild(aTag);
    URL.revokeObjectURL(url)
}

export default exportAsHtml