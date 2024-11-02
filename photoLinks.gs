function addPhotoLinksToSpreadsheet() {
  const folderId = '1XVl3YNPyOA4mSYTF_XO0KpAcjZsrjG-R'; // ID папки з фотографіями
  const sheetId = '17jMsk9VfaYNEazkAZzAtFOhPF6kw9goVomeZv27AA84'; // ID таблиці Google Sheets
  const sheetName = 'Поточні залишки'; // Назва аркуша з залишками товарів
  const photoColumn = 5; // Номер колонки для фото (стовпець "Фото товару")

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  let addedPhotos = 0; // Лічильник доданих посилань

  // Проходимо по кожному файлу в папці
  while (files.hasNext()) {
    const file = files.next();
    let fileName = file.getName(); // Ім'я файлу
    const fileUrl = file.getUrl(); // Посилання на файл

    // Видаляємо розширення файлу з назви
    fileName = fileName.split('.')[0].trim(); // Обрізаємо все після крапки, включаючи розширення, і видаляємо пробіли

    // Проходимо по кожному рядку в таблиці, щоб знайти відповідний товар за ID
    for (let i = 1; i < data.length; i++) {
      const productId = data[i][0].toString().trim(); // ID товару у першому стовпці, видаляємо зайві пробіли

      // Якщо ім'я файлу відповідає ID товару, додаємо посилання на файл
      if (fileName === productId) {
        sheet.getRange(i + 1, photoColumn).setValue(fileUrl); // Вставляємо посилання у стовпець "Фото товару"
        addedPhotos++; // Збільшуємо лічильник доданих фото
        break;
      }
    }
  }

  Logger.log(`Успішно додано ${addedPhotos} посилань на фото до таблиці.`);
}
