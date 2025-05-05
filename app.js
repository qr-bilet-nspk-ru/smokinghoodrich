document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();

    // Элементы интерфейса
    const unlockPhase = document.getElementById('unlock-phase');
    const scrollPhase = document.getElementById('scroll-phase');
    const resultPhase = document.getElementById('result-phase');
    const progressBar = document.getElementById('progress-bar');
    const itemsTrack = document.getElementById('items-track');
    const wonItemImage = document.getElementById('won-item-image');
    const wonItemName = document.getElementById('won-item-name');
    const wonItemFlavor = document.getElementById('won-item-flavor');
    const rarityBadge = document.getElementById('rarity-badge');
    const openBtn = document.getElementById('open-btn');
    const continueBtn = document.getElementById('continue-btn');
    const balanceEl = document.getElementById('balance');
    const inventoryGrid = document.getElementById('inventory-grid');
    const tabButtons = document.querySelectorAll('.tab-btn');

    // Звуки
    const unlockSound = document.getElementById('unlock-sound');
    const scrollSound = document.getElementById('scroll-sound');
    const slowdownSound = document.getElementById('slowdown-sound');
    const winSound = document.getElementById('win-sound');

    // Предметы
    const items = [
        { name: "TROPIC MINT", image: "images/items/tropic-mint.png", flavor: "Освежающая мята с тропическими нотами", rarity: "rare", strength: "3/5" },
        { name: "WINTERGREEN", image: "images/items/wintergreen.png", flavor: "Классический зимний вкус", rarity: "mythical", strength: "4/5" },
        { name: "BLUEBERRY", image: "images/items/blueberry.png", flavor: "Сладкая черника с ментолом", rarity: "rare", strength: "2/5" },
        { name: "ELDERFLOWER", image: "images/items/elderflower.png", flavor: "Нежный цветочный вкус бузины", rarity: "legendary", strength: "1/5" },
        { name: "JUICY PEACH", image: "images/items/peach.png", flavor: "Сочный персик с холодком", rarity: "common", strength: "2/5" }
    ];

    // Состояние
    let balance = 5;
    let isOpening = false;
    let scrollSpeed = 0;
    let scrollPosition = 0;
    let targetPosition = 0;
    let animationFrameId = null;
    let selectedItem = null;
    let userId = tg.initDataUnsafe.user?.id || 'default_user';

    // Инициализация
    initTabs();
    loadInventory();

    // Функции
    function initTabs() {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn, .tab-content').forEach(el => {
                    el.classList.remove('active');
                });
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
                
                if (btn.dataset.tab === 'inventory') {
                    loadInventory();
                }
            });
        });
    }

    async function loadInventory() {
        try {
            // В реальном приложении здесь будет fetch к вашему API
            const mockInventory = [
                { name: "TROPIC MINT", image: "images/items/tropic-mint.png", rarity: "rare" },
                { name: "BLUEBERRY", image: "images/items/blueberry.png", rarity: "rare" }
            ];
            
            renderInventory(mockInventory);
        } catch (error) {
            console.error('Ошибка загрузки инвентаря:', error);
        }
    }

    function renderInventory(items) {
        inventoryGrid.innerHTML = '';
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            itemEl.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <span class="rarity-badge ${item.rarity}">${item.rarity.toUpperCase()}</span>
            `;
            inventoryGrid.appendChild(itemEl);
        });
    }

    function fillItemsTrack() {
        itemsTrack.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const shuffled = [...items].sort(() => 0.5 - Math.random());
            shuffled.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'scroll-item';
                itemElement.innerHTML = `<img src="${item.image}" alt="${item.name}"><h3>${item.name}</h3>`;
                itemElement.dataset.item = JSON.stringify(item);
                itemsTrack.appendChild(itemElement);
            });
        }
    }

    function animateScroll() {
        const deceleration = 0.6;

        if (scrollSpeed > 0) {
            scrollSpeed = Math.max(scrollSpeed - deceleration, 0);
            scrollPosition += scrollSpeed;
        } else if (scrollSpeed === 0 && Math.abs(scrollPosition - targetPosition) > 1) {
            scrollPosition += (targetPosition - scrollPosition) * 0.08;
        } else {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            finishOpening();
            return;
        }

        itemsTrack.style.transform = `translateX(-${scrollPosition}px)`;
        checkCenterItem();
        animationFrameId = requestAnimationFrame(animateScroll);
    }

    function checkCenterItem() {
        const centerX = window.innerWidth / 2;
        let closestItem = null;
        let minDistance = Infinity;

        document.querySelectorAll('.scroll-item').forEach(item => {
            item.classList.remove('selected');
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const distance = Math.abs(itemCenter - centerX);

            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });

        if (closestItem) {
            closestItem.classList.add('selected');
            selectedItem = JSON.parse(closestItem.dataset.item);
        }
    }

    function startOpening() {
        if (isOpening || balance < 1) return;

        balance--;
        balanceEl.textContent = balance;
        isOpening = true;
        openBtn.disabled = true;

        unlockPhase.style.opacity = '1';
        scrollPhase.style.display = 'none';
        resultPhase.style.display = 'none';

        unlockSound.play();

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 2;
            progressBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(progressInterval);
                startScrolling();
            }
        }, 30);
    }

    function startScrolling() {
        unlockPhase.style.opacity = '0';
        scrollPhase.style.display = 'flex';

        fillItemsTrack();

        scrollPosition = 0;
        scrollSpeed = 30;

        const itemWidth = document.querySelector('.scroll-item').offsetWidth;
        const trackPadding = window.innerWidth / 2 - itemWidth / 2;
        const totalItems = itemsTrack.children.length;

        const stopIndex = Math.floor(Math.random() * totalItems);
        targetPosition = stopIndex * itemWidth - trackPadding;

        scrollSound.currentTime = 0;
        scrollSound.loop = true;
        scrollSound.play();

        animationFrameId = requestAnimationFrame(animateScroll);

        setTimeout(() => {
            scrollSpeed = 15;
            scrollSound.loop = false;
            slowdownSound.play();
        }, 2000);

        setTimeout(() => scrollSpeed = 5, 3000);
        setTimeout(() => scrollSpeed = 0, 4000);
    }

    function finishOpening() {
        scrollPhase.style.display = 'none';
        resultPhase.style.display = 'flex';

        wonItemImage.src = selectedItem.image;
        wonItemName.textContent = selectedItem.name;
        wonItemFlavor.textContent = selectedItem.flavor;

        const rarityText = {
            'common': 'ОБЫЧНЫЙ',
            'rare': 'РЕДКИЙ',
            'mythical': 'МИФИЧЕСКИЙ',
            'legendary': 'ЛЕГЕНДАРНЫЙ'
        }[selectedItem.rarity];

        rarityBadge.textContent = rarityText;
        rarityBadge.className = `rarity-badge ${selectedItem.rarity}`;

        // Вибрация
        if (window.navigator.vibrate) {
            window.navigator.vibrate([100, 50, 100]);
        }

        winSound.play();
        saveItemToInventory(selectedItem);
    }

    function saveItemToInventory(item) {
        // В реальном приложении здесь будет fetch к вашему API
        console.log('Предмет добавлен в инвентарь:', item);
        loadInventory(); // Обновляем инвентарь
    }

    function continueAfterWin() {
        resultPhase.style.display = 'none';
        unlockPhase.style.opacity = '1';
        progressBar.style.width = '0%';
        isOpening = false;

        if (balance === 0) {
            balance = 3;
            balanceEl.textContent = balance;
        }

        openBtn.disabled = false;
    }

    // Обработчики событий
    openBtn.addEventListener('click', startOpening);
    continueBtn.addEventListener('click', continueAfterWin);

    // Инициализация трека при загрузке
    fillItemsTrack();

    // Telegram Main Button
    if (tg.platform !== 'unknown') {
        tg.MainButton.setText("Купить пластинки");
        tg.MainButton.onClick(() => {
            tg.showPopup({
                title: "Пополнение баланса",
                message: "Выберите количество:",
                buttons: [
                    { id: '5', type: 'default', text: '5 пластинок за $5' },
                    { id: '10', type: 'default', text: '10 пластинок за $8' }
                ]
            }, (btnId) => {
                if (btnId) {
                    balance += parseInt(btnId);
                    balanceEl.textContent = balance;
                }
            });
        });
        tg.MainButton.show();
    }
});