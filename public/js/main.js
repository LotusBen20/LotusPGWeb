document.ondragstart = noselect;
document.onselectstart = noselect;
function noselect() {return false;}

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    const modalBackground = document.getElementById('modalBackground');
    const modalCard = document.getElementById('modalCard');

    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const rect = card.getBoundingClientRect();
            modalCard.style.top = rect.top + 'px';
            modalCard.style.left = rect.left + 'px';
            modalCard.style.width = rect.width + 'px';
            modalCard.style.height = rect.height + 'px';
            modalCard.innerHTML = card.innerHTML;

            modalCard.style.display = 'block';
            modalBackground.style.display = 'block';

            requestAnimationFrame(() => {
                modalCard.style.top = '50%';
                modalCard.style.left = '50%';
                modalCard.style.transform = 'translate(-50%, -50%) scale(1.1)';
            });
        });
    });

    modalBackground.addEventListener('click', () => {
        modalCard.style.transform = 'translate(-50%, -50%) scale(1)';
        setTimeout(() => {
            modalCard.style.display = 'none';
            modalBackground.style.display = 'none';
        }, 300);
    });
});
