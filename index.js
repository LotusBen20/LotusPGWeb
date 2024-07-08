import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import session from 'express-session';





const app = express();
const __dirname = path.resolve();


app.set('view engine', 'ejs');
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));

// Middleware для обработки данных формы и сессий
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: '7b07002cabe7587859e240c6f9b1b98f786d0bb0812db4305daa6284507a6500',
    resave: false,
    saveUninitialized: true,
}));

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
    if (!req.session.user && req.path !== '/auth') {
        return res.redirect('/auth');
    }
    next();
};

// Middleware для первого визита и перенаправления на страницу аутентификации
const redirectToAuth = (req, res, next) => {
    if (!req.session.visited && req.path !== '/auth') {
        req.session.visited = true;
        return res.redirect('/auth'); // Редирект на страницу аутентификации при первом визите
    }
    next();
};

// Применяем middleware для всех защищенных маршрутов, кроме /auth
app.use(['/admin', '/admin/cards', '/form'], requireAuth);

// Применяем middleware для первого визита ко всем маршрутам, кроме /auth
app.use((req, res, next) => {
    if (req.path !== '/auth') {
        redirectToAuth(req, res, next);
    } else {
        next();
    }
});



// Маршрут для отображения страницы аутентификации и обработки регистрации/входа
app.get('/auth', (req, res) => {
    res.render('auth', { 
        user: req.session.user,
        loginError: null,
        registerError: null
    });
});

// Пути к файлам
const cardsFilePath = path.join(__dirname, 'public', 'json', 'cards.json');
const usersFilePath = path.join(__dirname, 'public', 'json', 'users.json');

// Функции для работы с файлами
function readDataFromFile(filePath, callback) {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                callback(null, []); // Если файл не существует, возвращаем пустой массив
            } else {
                callback(err); // Если произошла другая ошибка, передаем ошибку
            }
        } else {
            try {
                const parsedData = data ? JSON.parse(data) : [];
                callback(null, parsedData);
            } catch (parseError) {
                callback(parseError);
            }
        }
    });
}

function writeDataToFile(filePath, data, callback) {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8', (err) => {
        if (err) {
            callback(err);
        } else {
            callback(null);
        }
    });
}

// Функция для генерации уникального id на основе текущего времени в миллисекундах
function generateUniqueId() {
    return Date.now();
}


// Роуты
// Маршрут для первого визита и перенаправления на страницу аутентификации
app.get('/', redirectToAuth, (req, res) => {
    readDataFromFile(cardsFilePath, (err, cards) => {
        if (err) {
            console.error('Ошибка чтения файла карточек:', err);
            res.status(500).send('Ошибка сервера');
        } else {
            res.render('index', { cards, user: req.session.user });
        }
    });
});

// Маршрут для защищенной административной страницы
app.get('/admin/cards', requireAuth, (req, res) => {
    readDataFromFile(cardsFilePath, (err, cards) => {
        if (err) {
            console.error('Ошибка чтения файла карточек:', err);
            res.status(500).send('Ошибка сервера');
        } else {
            res.render('admin/cards', { cards, user: req.session.user });
        }
    });
});


app.get('/admin/cards/:id/edit', (req, res) => {
    const { id } = req.params;
    readDataFromFile(cardsFilePath, (err, cards) => {
        if (err) {
            console.error('Ошибка чтения файла карточек:', err);
            res.status(500).send('Ошибка сервера');
        } else {
            const card = cards.find(c => c.id === parseInt(id));
            if (!card) {
                res.status(404).send('Карточка не найдена');
            } else {
                res.render('admin/edit', { card, user: req.session.user });
            }
        }
    });
});

app.post('/admin/cards/:id/update', (req, res) => {
    const { id } = req.params;
    const { title, text } = req.body;
    readDataFromFile(cardsFilePath, (readErr, cards) => {
        if (readErr) {
            console.error('Ошибка чтения файла карточек:', readErr);
            res.status(500).send('Ошибка сервера');
        } else {
            const index = cards.findIndex(c => c.id === parseInt(id));
            if (index === -1) {
                res.status(404).send('Карточка не найдена');
            } else {
                cards[index].title = title;
                cards[index].text = text;
                writeDataToFile(cardsFilePath, cards, (writeErr) => {
                    if (writeErr) {
                        console.error('Ошибка записифайла карточек:', writeErr);
                        res.status(500).send('Ошибка сервера');
                    } else {
                        res.redirect('/admin/cards');
                    }
                });
            }
        }
    });
});

app.post('/admin/cards/delete', (req, res) => {
    const { id } = req.body;
    readDataFromFile(cardsFilePath, (readErr, cards) => {
        if (readErr) {
            console.error('Ошибка чтения файла карточек:', readErr);
            res.status(500).send('Ошибка сервера');
        } else {
            const updatedCards = cards.filter(c => c.id !== parseInt(id));
            writeDataToFile(cardsFilePath, updatedCards, (writeErr) => {
                if (writeErr) {
                    console.error('Ошибка записи файла карточек:', writeErr);
                    res.status(500).send('Ошибка сервера');
                } else {
                    res.redirect('/admin/cards');
                }
            });
        }
    });
});

app.post('/add-card', (req, res) => {
    const { imageURL, title, text } = req.body;
    const newCard = {
        id: generateUniqueId(),
        imageURL,
        title,
        text
    };

    readDataFromFile(cardsFilePath, (readErr, cards) => {
        if (readErr) {
            console.error('Ошибка чтения файла карточек:', readErr);
            res.status(500).send('Ошибка сервера');
        } else {
            cards.push(newCard);
            writeDataToFile(cardsFilePath, cards, (writeErr) => {
                if (writeErr) {
                    console.error('Ошибка записи файла карточек:', writeErr);
                    res.status(500).send('Ошибка сервера');
                } else {
                    res.redirect('/admin/cards');
                }
            });
        }
    });
});

// Маршрут для отображения страницы аутентификации и обработки регистрации/входа
app.get('/auth', (req, res) => {
    res.render('auth', { 
        user: req.session.user,
        loginError: null,
        registerError: null
    });
});

app.post('/auth', (req, res) => {
    const { action, username, password, email } = req.body;

    if (action === 'register') {
        readDataFromFile(usersFilePath, (err, existingUsers) => {
            if (err) {
                console.error('Ошибка чтения файла пользователей:', err);
                return res.status(500).send('Ошибка сервера');
            }

            const userExists = existingUsers.find(user => user.username === username);
            if (userExists) {
                return res.render('auth', { registerError: 'Пользователь с таким именем уже зарегистрирован' });
            }

            const newUser = {
                id: generateUniqueId(), // Генерируем уникальный id
                username,
                password,
                email,
                role: 'Пользователь' // Добавляем дефолтную роль "Пользователь"
            };

            existingUsers.push(newUser);

            writeDataToFile(usersFilePath, existingUsers, (writeErr) => {
                if (writeErr) {
                    console.error('Ошибка записи файла пользователей:', writeErr);
                    return res.status(500).send('Ошибка сервера');
                }

                req.session.user = newUser;
                res.redirect('/');
            });
        });
    } else if (action === 'login') {
        readDataFromFile(usersFilePath, (err, users) => {
            if (err) {
                console.error('Ошибка чтения файла пользователей:', err);
                res.status(500).send('Ошибка сервера');
            } else {
                const user = users.find(user => user.username === username && user.password === password);
                if (user) {
                    req.session.user = user;
                    res.redirect('/');
                } else {
                    res.render('auth', { loginError: 'Неверные имя пользователя или пароль' });
                }
            }
        });
    } else {
        res.status(400).send('Неверный запрос');
    }
});

// Маршрут для обработки входа
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    readDataFromFile(usersFilePath, (err, users) => {
        if (err) {
            console.error('Ошибка чтения файла пользователей:', err);
            res.status(500).send('Ошибка сервера');
        } else {
            const user = users.find(user => user.username === username && user.password === password);
            if (user) {
                req.session.user = { username };
                res.redirect('/');
            } else {
                res.render('auth', { 
                    user: req.session.user,
                    loginError: 'Неверные имя пользователя или пароль',
                    registerError: null 
                });
            }
        }
    });
});



// Маршрут для обработки регистрации
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    readDataFromFile(usersFilePath, (err, users) => {
        if (err) {
            console.error('Ошибка чтения файла пользователей:', err);
            res.status(500).send('Ошибка сервера');
        } else {
            const userExists = users.find(user => user.username === username);
            if (userExists) {
                return res.render('auth', { 
                    user: req.session.user,
                    loginError: null,
                    registerError: 'Пользователь уже существует'
                });
            }

            const newUser = {
                id: generateUniqueId(), // Генерируем уникальный id для нового пользователя
                username,
                password,
                role: 'Пользователь' // Добавляем дефолтную роль "Пользователь"
            };

            users.push(newUser); // Добавляем нового пользователя в массив

            writeDataToFile(usersFilePath, users, (writeErr) => {
                if (writeErr) {
                    console.error('Ошибка записи файла пользователей:', writeErr);
                    res.status(500).send('Ошибка сервера');
                } else {
                    req.session.user = newUser; // Сохраняем пользователя в сессии
                    res.redirect('/'); // Перенаправляем на главную страницу после успешной регистрации
                }
            });
        }
    });
});


// Маршрут для административной панели пользователей
app.get('/admin/users', (req, res) => {
    readDataFromFile(usersFilePath, (err, users) => {
        if (err) {
            console.error('Ошибка чтения файла пользователей:', err);
            res.status(500).send('Ошибка сервера');
        } else {
            res.render('admin/users', { users });
        }
    });
});

// Роут для обновления данных пользователя
// Маршрут для обновления данных пользователя
app.put('/admin/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, password, email, role } = req.body;

    readDataFromFile(usersFilePath, (err, users) => {
        if (err) {
            console.error('Ошибка чтения файла пользователей:', err);
            res.status(500).send('Ошибка сервера');
        } else {
            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                res.status(404).send('Пользователь не найден');
            } else {
                // Update all fields
                users[userIndex].username = username;
                users[userIndex].password = password;
                users[userIndex].email = email;
                users[userIndex].role = role;

                // Write updated data back to file
                writeDataToFile(usersFilePath, users, (writeErr) => {
                    if (writeErr) {
                        console.error('Ошибка записи файла пользователей:', writeErr);
                        res.status(500).send('Ошибка сервера');
                    } else {
                        res.json(users[userIndex]); // Send updated user data back
                    }
                });
            }
        }
    });
});



// Маршрут для выхода
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Ошибка выхода');
        }
        res.redirect('/');
    });
});

app.get('/about', (req, res) => {
    res.render('about', { user: req.session.user });
});

app.get('/form', (req, res) => {
    res.render('form', { user: req.session.user });
});

const PORT = 3240;
const HOST = 'localhost';

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://${HOST}:${PORT}`);
});