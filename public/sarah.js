let postsData = [];

// DOM Elements
const btnSync = document.getElementById('btn-sync');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const feed = document.getElementById('feed');
const syncStatus = document.getElementById('sync-status');
const lastUpdate = document.getElementById('last-update');
const logSection = document.getElementById('log-section');
const logStatus = document.getElementById('log-status');
const logOutput = document.getElementById('log-output');

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize icons
    lucide.createIcons();
    
    // Load existing posts
    loadPosts();
    
    // Set up listeners
    searchInput.addEventListener('input', applyFiltersAndSort);
    sortSelect.addEventListener('change', applyFiltersAndSort);
    btnSync.addEventListener('click', runSync);
});

// Load posts from server
async function loadPosts() {
    try {
        const response = await fetch('/api/sarah/posts');
        const data = await response.json();
        
        if (data.success) {
            postsData = data.posts || [];
            
            if (data.lastUpdated) {
                lastUpdate.innerText = data.lastUpdated;
                syncStatus.innerText = '已同步';
                syncStatus.style.color = 'var(--success)';
            } else {
                lastUpdate.innerText = '從未同步';
                syncStatus.innerText = '無本地資料';
                syncStatus.style.color = 'var(--text-muted)';
            }
            
            applyFiltersAndSort();
        } else {
            console.error('Failed to load posts:', data.error);
            showEmptyFeed('載入資料發生錯誤，請重試。');
        }
    } catch (err) {
        console.error('Network error loading posts:', err);
        showEmptyFeed('無法連接伺服器，請確認後端是否已開啟。');
    }
}

// Trigger background scraper sync
async function runSync() {
    // UI Updates
    btnSync.disabled = true;
    btnSync.innerHTML = `<i data-lucide="loader" class="logo-icon animate-spin"></i><span>正在更新中...</span>`;
    lucide.createIcons();
    
    syncStatus.innerText = '正在爬取中...';
    syncStatus.style.color = 'var(--accent)';
    
    logSection.style.display = 'block';
    logStatus.innerText = 'RUNNING';
    logStatus.style.color = 'var(--accent)';
    logOutput.innerText = '正在啟動爬蟲程式...\n預估需要 30 到 60 秒，請勿關閉視窗...\n';
    
    // Show Skeletons in Feed
    feed.innerHTML = `
        <div class="post-card skeleton-card">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
        </div>
        <div class="post-card skeleton-card">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
        </div>
    `;

    try {
        const response = await fetch('/api/sarah/sync');
        const data = await response.json();
        
        if (data.success) {
            logStatus.innerText = 'COMPLETED';
            logStatus.style.color = 'var(--success)';
            logOutput.innerText = data.logs || '同步成功！';
            
            // Reload posts to update feed
            await loadPosts();
            
            alert(`同步完成！\n新增貼文數：${data.addedCount}\n重複跳過數：${data.skippedCount}`);
        } else {
            logStatus.innerText = 'FAILED';
            logStatus.style.color = 'var(--error)';
            logOutput.innerText = `同步失敗：\n${data.error || '未知錯誤'}\n\n日誌記錄：\n${data.logs || ''}`;
            
            syncStatus.innerText = '同步失敗';
            syncStatus.style.color = 'var(--error)';
            await loadPosts(); // Reload to show old data
        }
    } catch (err) {
        logStatus.innerText = 'ERROR';
        logStatus.style.color = 'var(--error)';
        logOutput.innerText = `網路連線異常：\n${err.message}`;
        
        syncStatus.innerText = '連線失敗';
        syncStatus.style.color = 'var(--error)';
        await loadPosts();
    } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = `<i data-lucide="refresh-cw"></i><span>一鍵更新資料</span>`;
        lucide.createIcons();
    }
}

// Filter and Sort Handler
function applyFiltersAndSort() {
    const searchText = searchInput.value.toLowerCase().trim();
    const sortBy = sortSelect.value;
    
    // 1. Filter
    let filtered = postsData.filter(post => {
        return (
            (post.smallTitle && post.smallTitle.toLowerCase().includes(searchText)) ||
            (post.originalContent && post.originalContent.toLowerCase().includes(searchText)) ||
            (post.fullContent && post.fullContent.toLowerCase().includes(searchText)) ||
            (post.date && post.date.includes(searchText))
        );
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortBy === 'oldest') {
            return new Date(a.date) - new Date(b.date);
        } else if (sortBy === 'title') {
            return (a.smallTitle || '').localeCompare(b.smallTitle || '', 'zh-TW');
        }
        return 0;
    });
    
    renderFeed(filtered);
}

// Render feed list HTML
function renderFeed(posts) {
    feed.innerHTML = '';
    
    if (posts.length === 0) {
        showEmptyFeed('沒有找到符合篩選條件的貼文。');
        return;
    }
    
    posts.forEach((post, idx) => {
        const card = document.createElement('div');
        card.className = 'post-card';
        
        const hasFullContent = post.fullContent && post.fullContent.trim() !== post.originalContent.trim();
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta-left">
                    <span class="badge-user">@${escapeHtml(post.username)} (${escapeHtml(post.authorName || '蔬菜批發找莎拉')})</span>
                    <h3 class="card-title">${escapeHtml(post.smallTitle || '無標題')}</h3>
                </div>
                <span class="card-date">${escapeHtml(post.date || '')}</span>
            </div>
            <div class="post-text">${formatText(post.originalContent || '')}</div>
            
            ${hasFullContent ? `
                <button class="expand-btn" onclick="toggleFullContent(this, ${idx})">
                    <i data-lucide="chevron-down"></i>
                    <span>展開完整子貼文串</span>
                </button>
                <div id="full-box-${idx}" class="full-content-box hidden">${formatText(post.fullContent || '')}</div>
            ` : ''}
        `;
        feed.appendChild(card);
    });
    
    lucide.createIcons();
}

// Full content toggle handler
window.toggleFullContent = function(btn, idx) {
    const box = document.getElementById(`full-box-${idx}`);
    const icon = btn.querySelector('i');
    
    if (box.classList.contains('hidden')) {
        box.classList.remove('hidden');
        btn.querySelector('span').innerText = '收起完整子貼文串';
        icon.setAttribute('data-lucide', 'chevron-up');
    } else {
        box.classList.add('hidden');
        btn.querySelector('span').innerText = '展開完整子貼文串';
        icon.setAttribute('data-lucide', 'chevron-down');
    }
    
    lucide.createIcons();
};

function showEmptyFeed(message) {
    feed.innerHTML = `
        <div class="empty-feed">
            <div class="empty-icon">📂</div>
            <p>${message}</p>
        </div>
    `;
}

function formatText(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
