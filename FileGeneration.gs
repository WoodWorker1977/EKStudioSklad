// Ваш код з файлу FileGeneration.gs

function sendStockReportAsFile(chatId) {
  // Якщо чат айді не переданий, встановити тестовий (для ручного запуску)
  chatId = chatId || 382633420;  // Тестовий chatId

  if (!chatId) {
    throw new Error('chatId не визначений або порожній');
  }

  // Надсилаємо повідомлення про генерацію файлу
  sendTelegramMessage(chatId, 'Файл генерується. Будь ласка, зачекайте...');
  
  try {
    const file = exportTableToExcel();  // Отримуємо Blob-файл Excel
    const fileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;

    const mimeType = file.getContentType();
    Logger.log('MIME тип файлу перед відправкою: ' + mimeType);
    Logger.log('Ім\'я Blob-файлу перед відправкою: ' + file.getName());

    if (mimeType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      throw new Error(`Неправильний формат файлу: ${mimeType}. Очікується Excel-файл.`);
    }

    const formData = {
      'chat_id': chatId.toString(),
      'caption': 'Ось ваш звіт з поточних залишків у форматі Excel',
      'document': file.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    };

    const options = {
      method: 'post',
      payload: formData,
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(fileUrl, options);
    const result = JSON.parse(response.getContentText());

    if (!result.ok) {
      throw new Error('Помилка при відправці файлу в Telegram: ' + result.description);
    }

    Logger.log('Файл успішно відправлено в Telegram.');
  } catch (error) {
    Logger.log('Помилка в sendStockReportAsFile: ' + error.message);
    sendTelegramMessage(chatId, 'Сталася помилка при генерації файлу: ' + error.message);
  }
}

// - - - - - - - - - - - - - - - - - - -

function exportTableToExcel() {
  const spreadsheetId = '17jMsk9VfaYNEazkAZzAtFOhPF6kw9goVomeZv27AA84';
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('Поточні залишки');

  // Перевірка наявності аркуша
  if (!sheet) {
    throw new Error('Аркуш "Поточні залишки" не знайдено в таблиці.');
  }

  const range = sheet.getDataRange();
  const values = range.getValues();

  // Логування кількості рядків і стовпців
  console.log('Кількість рядків:', values.length);
  console.log('Кількість стовпців:', values[0].length);
  console.log('Перший рядок даних:', values[0]);

  // Перевірка, чи є дані в таблиці
  if (values.length === 0 || values[0].length === 0) {
    throw new Error('Аркуш "Поточні залишки" не містить даних.');
  }

  // Створюємо нову таблицю для експорту
  const newSpreadsheet = SpreadsheetApp.create('Zvit_zalishkiv_copy'); // Латинські символи
  const newSheet = newSpreadsheet.getActiveSheet();
  newSheet.setName('Potochni_zalishki'); // Латинські символи

  // Копіюємо дані
  newSheet.getRange(1, 1, values.length, values[0].length).setValues(values);

  // Фіксуємо зміни
  SpreadsheetApp.flush();

  // Формуємо URL для експорту у форматі Excel
  const exportUrl = `https://docs.google.com/spreadsheets/d/${newSpreadsheet.getId()}/export?format=xlsx`;

  // Отримуємо OAuth токен
  const token = ScriptApp.getOAuthToken();

  // Виконуємо запит для отримання файлу
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  });

  // Перевіряємо статус відповіді
  if (response.getResponseCode() !== 200) {
    throw new Error('Помилка експорту таблиці: ' + response.getContentText());
  }

  // Форматуємо поточну дату і час
  const now = new Date();
  const formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd-MM-yyyy_HH-mm');

  // Створюємо Blob з встановленим іменем (латинські символи)
  const blob = Utilities.newBlob(
    response.getContent(),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    `Potochni_zalishki_${formattedDate}.xlsx`
  );

  // Логування імені Blob-файлу для перевірки
  console.log('Ім\'я Blob-файлу:', blob.getName());
  console.log('MIME тип блоб-файлу:', blob.getContentType());

  // Видаляємо тимчасову копію таблиці
  DriveApp.getFileById(newSpreadsheet.getId()).setTrashed(true);

  return blob;
}
