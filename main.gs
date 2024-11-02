function doPost(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      var contents = JSON.parse(e.postData.contents);
      var spreadsheetId = '17jMsk9VfaYNEazkAZzAtFOhPF6kw9goVomeZv27AA84';
      var bot = new Bot(spreadsheetId, contents);

      if (contents.message) {
        bot.handleMessage(contents.message);
      } else if (contents.callback_query && typeof bot.handleCallback === 'function') {
        bot.handleCallback(contents.callback_query);
      } else {
        console.log('Необроблений запит або callback');
      }
    } catch (error) {
      console.log('Помилка при обробці запиту: ' + error.message);
    }
  } else {
    console.log('Отримано порожній або неправильний запит');
  }
}

function sendTelegramMessage(chatId, text, keyboard) {
  if (!text || text.trim() === '') {
    console.log('Помилка: текст повідомлення порожній. Повідомлення не було надіслане.');
    return;
  }

  var botToken = '7405510649:AAEvv-HY__tIAf_NsURKhY6Z3Br5goN74ao';
  var data = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };

  if (keyboard) {
    data.reply_markup = JSON.stringify(keyboard);
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };

  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', options);
  } catch (error) {
    console.log('Помилка при надсиланні повідомлення: ' + error.message);
  }
}
