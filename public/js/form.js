document.addEventListener('DOMContentLoaded', () => {
    const cardForm = document.getElementById('cardForm');
    const cardContainer = document.getElementById('card-container');

    cardForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Получение данных из формы
        const imageURL = document.getElementById('imageURL').value;
        const title = document.getElementById('title').value;
        const text = document.getElementById('text').value;

        // Создание объекта для отправки на сервер
        const formData = {
            imageURL,
            title,
            text
        };

        // Отправка данных на сервер
        fetch('/add-card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сервера: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            // Если данные успешно добавлены на сервер, добавляем карточку на страницу
            const card = createCardElement(data); // функция createCardElement будет описана ниже
            cardContainer.appendChild(card);

            // Очистка формы
            cardForm.reset();
        })
        .catch(error => {
            console.error('Ошибка при добавлении карточки:', error);
            alert('Произошла ошибка при добавлении карточки. Пожалуйста, попробуйте еще раз.');
        });
    });

    // Функция для создания HTML элемента карточки
    function createCardElement(cardData) {
        const card = document.createElement('div');
        card.className = 'col mb-4';
        card.innerHTML = `
            <div class="card h-100 shadow">
                <img src="${cardData.imageURL}" class="card-img-top" alt="...">
                <div class="card-body">
                    <h5 class="card-title">${cardData.title}</h5>
                    <p class="card-text">${cardData.text}</p>
                    <a href="#" class="btn btn-primary">Подробнее</a>
                </div>
            </div>
        `;
        return card;
    }
});
