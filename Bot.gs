// Ваш код з файлу Bot.gs

const PHOTOS_FOLDER_ID = '1XVl3YNPyOA4mSYTF_XO0KpAcjZsrjG-R'; // Замініть на фактичний ID папки з фотографіями
const BOT_TOKEN = '7405510649:AAEvv-HY__tIAf_NsURKhY6Z3Br5goN74ao'; // Замініть на ваш фактичний токен бота

class Bot {
  constructor(spreadsheetId, update) {
    this.spreadsheetId = spreadsheetId;
    this.chatId = update.message ? update.message.chat.id : (update.callback_query ? update.callback_query.message.chat.id : null);
    Logger.log('Chat ID in constructor: ' + this.chatId);  // Додайте це для логування
    this.spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
    this.stateSheet = this.spreadsheet.getSheetByName('BotState') || this.spreadsheet.insertSheet('BotState');
    this.deleteProductId = null; // Змінна для зберігання ID товару для видалення
  }

  getState() {
    const data = this.stateSheet.getDataRange().getValues();
    const stateRow = data.find(row => row[0] === this.chatId);
    return stateRow ? stateRow[1] : null;
  }

  setState(state) {
    const data = this.stateSheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[0] === this.chatId);
    if (rowIndex !== -1) {
      this.stateSheet.getRange(rowIndex + 1, 2).setValue(state);
    } else {
      this.stateSheet.appendRow([this.chatId, state]);
    }
  }

handleMessage(message) {
  const state = this.getState();
  const cleanText = message.text ? message.text.trim().toLowerCase() : '';

  // Інші кейси для команд
  switch (cleanText) {
    case '/start':
    case '/menu':
      this.sendMainMenu();
      break;
    case '📦 база товарів':
      this.setState('in_product_menu');
      this.sendProductMenu();
      break;
    case '💼 операції':
      this.setState('in_operations_menu');
      this.sendOperationsMenu();
      break;
    case '🔍 пошук товарів':
      this.setState('awaiting_product_query');
      sendTelegramMessage(this.chatId, 'Введи ID або пошукове слово товару.');
      break;

case '📝 отримати всі залишки':
  Logger.log('Кнопка "Отримати всі залишки" натиснута');
  Logger.log('Chat ID: ' + this.chatId);

  // Додаємо лог для перевірки, чи доступна функція sendStockReportAsFile
  Logger.log('Тип sendStockReportAsFile: ' + typeof sendStockReportAsFile);

  try {
    // Викликаємо функцію без "this."
    sendStockReportAsFile(this.chatId);  // Передаємо chatId з контексту
  } catch (error) {
    Logger.log('Помилка при виклику sendStockReportAsFile: ' + error.message);
    sendTelegramMessage(this.chatId, 'Сталася помилка при генерації файлу: ' + error.message);
  }
  break;

    case 'назад':
    case '🔙 назад':
      this.setState(null);
      this.sendMainMenu();
      break;
    case '⬆️ надходження':
      this.setState('awaiting_inflow');
      sendTelegramMessage(this.chatId, 'Введи дані для надходження у форматі "ID, Кіль-ть"');
      break;
    case '⬇️ списання':
      this.setState('awaiting_outflow');
      sendTelegramMessage(this.chatId, 'Введи дані для списання у форматі "ID, Кіль-ть"');
      break;
    case '➕ додати товар':
      this.setState('awaiting_add_product');

      // Отримуємо таблицю з даними про товари
      const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
      const data = stockSheet.getDataRange().getValues();

      // Отримуємо всі існуючі ID
      const ids = data.slice(1).map(row => parseInt(row[0])).filter(id => !isNaN(id)); // Беремо всі існуючі ID з таблиці, окрім заголовків
      const maxId = ids.length ? Math.max(...ids) : 0; // Якщо немає товарів, то maxId = 0
      const nextId = maxId + 1; // Пропонуємо наступний вільний ID

      // Відправляємо повідомлення з пропозицією наступного ID
      sendTelegramMessage(this.chatId, `Вільний ID: ${nextId}. Введи дані нового товару в форматі: "ID (або залиште ${nextId}), Наймен., Од. виміру, Кіль-ть, Примітки (не обов'язково).`);
      break;

    case '🗑 видалити товар':
      this.setState('awaiting_delete_product');
      sendTelegramMessage(this.chatId, 'Введи ID товару, який потрібно видалити.');
      break;
    case '✏️ редагувати товар':
      this.setState('awaiting_edit_product');
      sendTelegramMessage(this.chatId, 'Введи дані для редагування у форматі "ID, Наймен., Од. виміру, Примітки (не обов\'язково)"');
      break;
    case '🖼 додати/замінити фото':
      this.setState('awaiting_photo_for_existing_product');
      sendTelegramMessage(this.chatId, 'Введи ID товару, до якого хочеш додати або замінити фото.');
      break;
    case 'так':
      if (state === 'awaiting_delete_product_confirmation') {
        this.handleDeleteProduct(this.deleteProductId);
      }
      break;
    case 'ні':
      if (state === 'awaiting_delete_product_confirmation') {
        sendTelegramMessage(this.chatId, 'Видалення товару скасовано.');
        this.setState(null);
        this.sendProductMenu();
      }
      break;
    default:
      if (state === 'awaiting_inflow') {
        this.handleInflow(cleanText);
      } else if (state === 'awaiting_outflow') {
        this.handleOutflow(cleanText);
      } else if (state === 'awaiting_add_product') {
        this.handleAddProduct(cleanText);
      } else if (state === 'awaiting_delete_product') {
        this.deleteProductId = cleanText.trim();
        sendTelegramMessage(this.chatId, `Впевнений, що хочеш видалити товар ${this.deleteProductId}? Напиши "Так", або "Ні", щоб скасувати.`);
        this.setState('awaiting_delete_product_confirmation');
      } else if (state === 'awaiting_edit_product') {
        this.handleEditProduct(cleanText);
      } else if (state === 'awaiting_product_query') {
        this.showProductByQuery(cleanText);
      } else if (state === 'awaiting_photo_for_existing_product') {
        this.promptForPhoto(cleanText);
      } else {
        this.sendMainMenu();
      }
  }
}

  sendMainMenu() {
    var keyboard = {
      keyboard: [
        [{ text: '📦 База товарів' }, { text: '💼 Операції' }],
        [{ text: '🔍 Пошук товарів' }],
        [{ text: '📝 Отримати всі залишки' }] // Додана кнопка "Отримати всі залишки"
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };
    sendTelegramMessage(this.chatId, 'Оберіть опцію:', keyboard);
  }

  sendOperationsMenu() {
    var keyboard = {
      keyboard: [
        [{ text: '⬆️ Надходження' }, { text: '⬇️ Списання' }],
        [{ text: '🔙 Назад' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };
    this.setState('in_operations_menu');
    sendTelegramMessage(this.chatId, 'Оберіть операцію:', keyboard);
  }

  sendProductMenu() {
    var keyboard = {
      keyboard: [
        [{ text: '➕ Додати товар' }, { text: '🗑 Видалити товар' }],
        [{ text: '✏️ Редагувати товар' }, { text: '🖼 Додати/Замінити фото' }],
        [{ text: '🔙 Назад' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };
    this.setState('in_product_menu');
    sendTelegramMessage(this.chatId, 'Оберіть дію з товарами:', keyboard);
  }

  promptForPhoto(input) {
    const productId = input.trim();
    if (!productId) {
      sendTelegramMessage(this.chatId, 'Введи коректний ID товару.');
      return;
    }

    const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
    const data = stockSheet.getDataRange().getValues();
    const productExists = data.some(row => row[0].toString() === productId);

    if (!productExists) {
      sendTelegramMessage(this.chatId, `Товар з ID ${productId} не знайдено.`);
      return;
    }

    this.setState(`awaiting_photo_existing_${productId}`);
    sendTelegramMessage(this.chatId, 'Прикріпи фото товару або напиши "Ні", щоб скасувати.');
  }

  handleInflow(input) {
    const [id, quantity] = input.split(',').map(item => item.trim());
    if (!id || isNaN(id) || !quantity || isNaN(quantity)) {
      sendTelegramMessage(this.chatId, 'Неправильний формат. Спробуй ще раз у форматі "ID, Кіль-ть"');
      return;
    }

    const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
    const data = stockSheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[0].toString() === id);

    if (rowIndex === -1) {
      sendTelegramMessage(this.chatId, `Товар з ID ${id} не знайдено.`);
      return;
    }

    const newQuantity = parseInt(data[rowIndex][3]) + parseInt(quantity);
    stockSheet.getRange(rowIndex + 1, 4).setValue(newQuantity);

    const productName = data[rowIndex][1];
    const unit = data[rowIndex][2];

    sendTelegramMessage(this.chatId, `Кіль-ть товару ${id} оновлено. Назва: ${productName}, Кіль-ть: ${newQuantity} ${unit}`);
    this.setState(null);
    this.sendOperationsMenu();
  }

  handleOutflow(input) {
    const [id, quantity] = input.split(',').map(item => item.trim());
    if (!id || isNaN(id) || !quantity || isNaN(quantity)) {
      sendTelegramMessage(this.chatId, 'Неправильний формат. Спробуй ще раз у форматі "ID, Кіль-ть"');
      return;
    }

    const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
    const data = stockSheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[0].toString() === id);

    if (rowIndex === -1) {
      sendTelegramMessage(this.chatId, `Товар ${id} не знайдено.`);
      return;
    }

    const newQuantity = parseInt(data[rowIndex][3]) - parseInt(quantity);
    if (newQuantity < 0) {
      sendTelegramMessage(this.chatId, `Обломайся, маємо поточну кіль-ть товару: ${data[rowIndex][3]}`);
      return;
    }

    stockSheet.getRange(rowIndex + 1, 4).setValue(newQuantity);

    const productName = data[rowIndex][1];
    const unit = data[rowIndex][2];

    sendTelegramMessage(this.chatId, `Кіль-ть товару ${id} оновлено. ${productName}, Кіль-сть: ${newQuantity} ${unit}`);
    this.setState(null);
    this.sendOperationsMenu();
  }

  handleAddProduct(input) {
    const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
    const data = stockSheet.getDataRange().getValues();
    const ids = data.slice(1).map(row => parseInt(row[0])); // Беремо всі існуючі ID з таблиці, крім заголовків
    const maxId = ids.length ? Math.max(...ids) : 0; // Якщо немає товарів, то maxId = 0
    const nextId = maxId + 1; // Пропонуємо наступний вільний ID
    const [idInput, name, unit, quantity, notes] = input.split(',').map(item => item.trim());

    const id = idInput ? idInput : nextId.toString();
    if (!name || !unit || !quantity || isNaN(quantity)) {
      sendTelegramMessage(this.chatId, `Неправильний формат. Спробуй ще раз у форматі "ID (або залиш ${nextId}), Наймен., Одиниця виміру, Кіль-ть, Примітки (не обов'язково)"`);
      return;
    }

    const existingProduct = data.find(row => row[0].toString() === id);
    if (existingProduct) {
      sendTelegramMessage(this.chatId, `Товар ${id} вже існує.`);
      return;
    }

    stockSheet.appendRow([id, name, unit, quantity, '', notes || '']);
    sendTelegramMessage(this.chatId, `Товар ${id} успішно додано.`);
    this.setState(`awaiting_add_photo_${id}`);
    sendTelegramMessage(this.chatId, 'Додай фото до товару або напиши"Ні".');
  }

  handleEditProduct(input) {
    const [id, name, unit, notes] = input.split(',').map(item => item.trim());
    if (!id || !name || !unit) {
      sendTelegramMessage(this.chatId, 'Неправильний формат. Спробуй ще раз у форматі "ID, Наймен., Од. виміру, Примітки (не обов\'язково)"');
      return;
    }

    const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
    const data = stockSheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[0].toString() === id);

    if (rowIndex === -1) {
      sendTelegramMessage(this.chatId, `Товар ${id} не знайдено.`);
      return;
    }

    stockSheet.getRange(rowIndex + 1, 2).setValue(name); // Найменування товару
    stockSheet.getRange(rowIndex + 1, 3).setValue(unit); // Одиниця виміру
    stockSheet.getRange(rowIndex + 1, 6).setValue(notes || ''); // Примітки

    sendTelegramMessage(this.chatId, `Товар ${id} успішно оновлено.`);
    this.setState(`awaiting_edit_photo_${id}`);
    sendTelegramMessage(this.chatId, 'Прикріпи нове фото до товару або напиши "Ні".');
  }

  handleDeleteProduct(input) {
    const id = input.trim();
    if (!id) {
      sendTelegramMessage(this.chatId, 'Введи коректний ID товару.');
      return;
    }

    const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
    const data = stockSheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[0].toString() === id);

    if (rowIndex === -1) {
      sendTelegramMessage(this.chatId, `Товар ${id} не знайдено.`);
      return;
    }

    stockSheet.deleteRow(rowIndex + 1);
    const folder = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
    const file = this.findFileByName(`${id}.jpg`, folder);
    if (file) {
      file.setTrashed(true);
    }

    sendTelegramMessage(this.chatId, `Товар ${id} успішно видалено.`);
    this.setState(null);
    this.sendProductMenu();
  }

  handlePhoto(photoArray, productId) {
    try {
      const fileId = photoArray[photoArray.length - 1].file_id;
      const fileResponse = UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const filePath = JSON.parse(fileResponse.getContentText()).result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
      const imageResponse = UrlFetchApp.fetch(fileUrl);
      const blob = imageResponse.getBlob();
      blob.setName(`${productId}.jpg`);

      const folder = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
      const existingFile = this.findFileByName(`${productId}.jpg`, folder);
      if (existingFile) {
        existingFile.setTrashed(true);
      }

      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileUrlDirect = file.getUrl();
      const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
      const data = stockSheet.getDataRange().getValues();
      const rowIndex = data.findIndex(row => row[0].toString() === productId);

      if (rowIndex !== -1) {
        stockSheet.getRange(rowIndex + 1, 5).setValue(fileUrlDirect);
      }

      sendTelegramMessage(this.chatId, 'Фото успішно додано до товару.');
      this.setState(null);
      this.sendMainMenu();
    } catch (error) {
      sendTelegramMessage(this.chatId, 'Стався якийсь завтик. Спробуй ще раз.');
      console.error('Помилка в handlePhoto:', error);
    }
  }

  findFileByName(fileName, folder) {
    const files = folder.getFilesByName(fileName);
    return files.hasNext() ? files.next() : null;
  }

  showProductByQuery(input) {
    const stockSheet = this.spreadsheet.getSheetByName('Поточні залишки');
    const data = stockSheet.getDataRange().getValues();
    let result = '';

    if (input.toLowerCase() === 'всі') {
      const currentDate = new Date().toLocaleDateString();
      result = `Всі поточні залишки на складі станом на ${currentDate}:\n\n`;

      if (data.length <= 1) {
        result += 'Обломайся, на складі немає товарів.';
      } else {
        const sortedData = data.slice(1).sort((a, b) => a[0] - b[0]);

        sortedData.forEach((row) => {
          const id = row[0];
          const name = row[1];
          const quantity = row[3];
          const unit = row[2];
          const notes = row[5] ? ` (${row[5]})` : '';
          const photoLink = row[4] ? ` <a href="${row[4]}">[Фото]</a>` : '';

          result += `${id}. ${name}, ${quantity} ${unit}${notes}.${photoLink}\n`;
        });
      }
    } else if (/^\d+(,\d+)*$/.test(input.trim())) {
      const ids = input.split(',').map(id => id.trim());
      ids.forEach((id) => {
        const row = data.find(row => row[0].toString() === id);
        if (row) {
          const name = row[1];
          const quantity = row[3];
          const unit = row[2];
          const notes = row[5] ? ` (${row[5]})` : '';
          const photoLink = row[4] ? ` <a href="${row[4]}">[Фото]</a>` : '';

          result += `${id}. ${name}, ${quantity} ${unit}${notes}.${photoLink}\n`;
        } else {
          result += `Товар ${id} не знайдено.\n`;
        }
      });
    } else {
      const searchTerms = input.toLowerCase().split(/[,]+/).map(term => term.trim()).filter(term => term.length > 0);
      data.forEach((row) => {
        const rowString = row.join(' ').toLowerCase();
        if (searchTerms.some(term => rowString.includes(term))) {
          const id = row[0];
          const name = row[1];
          const quantity = row[3];
          const unit = row[2];
          const notes = row[5] ? ` (${row[5]})` : '';
          const photoLink = row[4] ? ` <a href="${row[4]}">[Фото]</a>` : '';

          result += `${id}. ${name}, ${quantity} ${unit}${notes}.${photoLink}\n`;
        }
      });

      if (result === '') {
        result = 'Товарів за цією назвою або примітками не знайдено.';
      }
    }

    sendTelegramMessage(this.chatId, result);
    this.setState(null);
  }
}

// Функція для надсилання повідомлень в Telegram
function sendTelegramMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: keyboard ? JSON.stringify(keyboard) : undefined
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}
