// State Variables
let crawledData = null;

// DOM Elements
const scrapeForm = document.getElementById('scrape-form');
const usernameInput = document.getElementById('username-input');
const submitBtn = document.getElementById('submit-btn');
const suggestionTags = document.querySelectorAll('.suggestion-tag');

const welcomeScreen = document.getElementById('welcome-screen');
const loadingState = document.getElementById('loading-state');
const loadingSubtitle = document.getElementById('loading-subtitle');
const mainContent = document.getElementById('main-content');

// Profile Elements
const userAvatar = document.getElementById('user-avatar');
const userFullname = document.getElementById('user-fullname');
const userUsernameDisplay = document.getElementById('user-username-display');
const userBio = document.getElementById('user-bio');
const userFollowers = document.getElementById('user-followers');
const userThreadsCount = document.getElementById('user-threads-count');
const userLink = document.getElementById('user-link');

// Filter & Control Elements
const filterInput = document.getElementById('filter-input');
const sortSelect = document.getElementById('sort-select');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonBtn = document.getElementById('export-json-btn');

// Feed Elements
const postsCount = document.getElementById('posts-count');
const totalLikesBadge = document.getElementById('total-likes-badge');
const postsFeed = document.getElementById('posts-feed');

// Lightbox Elements
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const closeLightbox = document.querySelector('.close-lightbox');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Loading state messages simulation list
const loadingMessages = [
    '啟動無頭瀏覽器模擬...',
    '引導安全連線與繞過驗證...',
    '載入 Threads 目標頁面中...',
    '解析並等待 JavaScript 渲染完畢...',
    '攔截網路流量，提取 GraphQL 結構化封包...',
    '正在整理貼文、媒體檔案與社交指標...'
];

// Event Listeners
scrapeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
        startScrape(username);
    }
});

suggestionTags.forEach(tag => {
    tag.addEventListener('click', () => {
        const username = tag.getAttribute('data-username');
        usernameInput.value = username;
        startScrape(username);
    });
});

filterInput.addEventListener('input', applyFiltersAndSort);
sortSelect.addEventListener('change', applyFiltersAndSort);

exportJsonBtn.addEventListener('click', exportJSON);
exportCsvBtn.addEventListener('click', exportCSV);

// Lightbox events
closeLightbox.addEventListener('click', closeLightboxView);
lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) {
        closeLightboxView();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightboxModal.classList.contains('hidden')) {
        closeLightboxView();
    }
});

// Toast system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'toast-icon' } });
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Scrape execution
let loadingInterval = null;
async function startScrape(username) {
    // UI state change
    welcomeScreen.classList.add('hidden');
    mainContent.classList.add('hidden');
    loadingState.classList.remove('hidden');
    submitBtn.disabled = true;
    
    // Simulate loading progress steps
    let msgIndex = 0;
    loadingSubtitle.innerText = loadingMessages[0];
    loadingInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        loadingSubtitle.innerText = loadingMessages[msgIndex];
    }, 4000);
    
    try {
        const response = await fetch(`/api/scrape?username=${encodeURIComponent(username)}`);
        const result = await response.json();
        
        clearInterval(loadingInterval);
        
        if (response.ok && result.success) {
            crawledData = result;
            renderProfile(result.user);
            applyFiltersAndSort();
            
            // Show content
            loadingState.classList.add('hidden');
            mainContent.classList.remove('hidden');
            showToast(`成功爬取 @${username} 的資料！`, 'success');
        } else {
            throw new Error(result.error || '爬取失敗，請稍後再試');
        }
    } catch (err) {
        clearInterval(loadingInterval);
        loadingState.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Render Profile Metadata
function renderProfile(user) {
    userAvatar.src = user.avatar || 'https://www.threads.net/static/images/avatar.png';
    userFullname.innerText = user.fullName;
    userUsernameDisplay.innerText = `@${user.username}`;
    userBio.innerText = user.bio || '此用戶尚未填寫簡介。';
    userFollowers.innerText = user.followersText.replace('位粉絲', '').trim();
    userThreadsCount.innerText = user.threadsCountText.replace('則串文', '').trim();
    userLink.href = `https://www.threads.net/@${user.username}`;
}

// Filter and Sort Processing
function applyFiltersAndSort() {
    if (!crawledData || !crawledData.posts) return;
    
    const filterText = filterInput.value.toLowerCase().trim();
    const sortBy = sortSelect.value;
    
    // 1. Filter
    let filtered = crawledData.posts.filter(thread => {
        // A thread matches if any of its items matches the text
        return thread.items.some(item => {
            return item.text.toLowerCase().includes(filterText);
        });
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        const itemA = a.items[0];
        const itemB = b.items[0];
        
        if (sortBy === 'newest') {
            return itemB.takenAt - itemA.takenAt;
        } else if (sortBy === 'oldest') {
            return itemA.takenAt - itemB.takenAt;
        } else if (sortBy === 'likes') {
            return itemB.likeCount - itemA.likeCount;
        } else if (sortBy === 'replies') {
            return itemB.replyCount - itemA.replyCount;
        }
        return 0;
    });
    
    // 3. Update summary stats
    let totalLikes = 0;
    filtered.forEach(thread => {
        thread.items.forEach(item => {
            totalLikes += item.likeCount;
        });
    });
    
    postsCount.innerText = filtered.length;
    totalLikesBadge.querySelector('.val').innerText = formatNumber(totalLikes);
    
    // 4. Render post cards
    renderFeed(filtered);
}

// Render dynamic Feed Cards
function renderFeed(threads) {
    postsFeed.innerHTML = '';
    
    if (threads.length === 0) {
        postsFeed.innerHTML = `
            <div class="glass-card empty-feed-card">
                <i data-lucide="info" class="empty-icon"></i>
                <p>沒有符合篩選條件的貼文。</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    threads.forEach(thread => {
        const card = document.createElement('div');
        card.className = 'glass-card post-card';
        
        // Build card HTML
        let cardHTML = '';
        
        // Loop thread items (First is main post, others are thread replies/children)
        thread.items.forEach((post, idx) => {
            if (idx > 0) {
                cardHTML += `<div class="thread-divider"></div>`;
            }
            
            const isChild = idx > 0;
            const containerClass = isChild ? 'thread-item-child' : 'thread-item-parent';
            
            // Format Time
            const dateStr = new Date(post.takenAt * 1000).toLocaleString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            // Media HTML
            let mediaHTML = '';
            if (post.media && post.media.length > 0) {
                const gridClass = getMediaGridClass(post.media.length);
                mediaHTML += `<div class="post-media-container ${gridClass}">`;
                
                post.media.forEach((m, mIdx) => {
                    if (m.type === 'image') {
                        mediaHTML += `
                            <div class="media-item-wrapper grid-item-${mIdx + 1}" onclick="openLightbox('${m.url}', '${escapeHtml(post.text)}')">
                                <img src="${m.url}" alt="Post Image" loading="lazy">
                            </div>
                        `;
                    } else if (m.type === 'video') {
                        mediaHTML += `
                            <div class="media-item-wrapper video-item-wrapper grid-item-${mIdx + 1}">
                                <video src="${m.url}" poster="${m.thumbnail || ''}" controls preload="metadata" playsinline></video>
                            </div>
                        `;
                    }
                });
                
                mediaHTML += `</div>`;
            }
            
            cardHTML += `
                <div class="${containerClass}">
                    <div class="post-header">
                        <div class="post-author-info">
                            <img src="${crawledData.user.avatar || 'https://www.threads.net/static/images/avatar.png'}" alt="Avatar" class="post-author-avatar">
                            <div class="post-meta-details">
                                <div class="author-name-row">
                                    <span class="author-name">${crawledData.user.fullName}</span>
                                    <i data-lucide="badge-check" class="verified-icon"></i>
                                </div>
                                <span class="author-handle">@${crawledData.user.username}</span>
                            </div>
                        </div>
                        <div class="post-meta-right">
                            <span class="post-time">${dateStr}</span>
                            <a href="${post.url}" target="_blank" class="post-link" title="在 Threads 開啟">
                                <i data-lucide="external-link"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div class="post-content">${formatText(post.text)}</div>
                    
                    ${mediaHTML}
                    
                    <div class="post-actions">
                        <span class="action-btn likes"><i data-lucide="heart"></i> ${formatNumber(post.likeCount)} 次讚</span>
                        <span class="action-btn replies"><i data-lucide="message-square"></i> ${formatNumber(post.replyCount)} 則回覆</span>
                    </div>
                </div>
            `;
        });
        
        card.innerHTML = cardHTML;
        postsFeed.appendChild(card);
    });
    
    // Refresh icons
    lucide.createIcons();
}

// Helper to determine CSS grid layouts for multi-image posts
function getMediaGridClass(count) {
    if (count === 1) return 'media-grid-1';
    if (count === 2) return 'media-grid-2';
    if (count === 3) return 'media-grid-3';
    return 'media-grid-multi';
}

// Format numbers nicely (e.g. 5600 -> 5.6k)
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + ' 萬';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num;
}

// Convert plain text breaks into HTML line breaks
function formatText(text) {
    if (!text) return '';
    return escapeHtml(text).replace(/\n/g, '<br>');
}

// Escape HTML tags to prevent XSS in text injection
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Lightbox modal controls
function openLightbox(url, captionText) {
    lightboxImg.src = url;
    lightboxCaption.innerText = captionText;
    lightboxModal.classList.remove('hidden');
}

function closeLightboxView() {
    lightboxModal.classList.add('hidden');
    lightboxImg.src = '';
    lightboxCaption.innerText = '';
}

// Export parsed data to JSON format
function exportJSON() {
    if (!crawledData) {
        showToast('無可導出資料，請先完成爬取', 'error');
        return;
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(crawledData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${crawledData.user.username}_threads.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('JSON 導出成功！', 'success');
}

// Export parsed data to CSV format
function exportCSV() {
    if (!crawledData || !crawledData.posts) {
        showToast('無可導出資料，請先完成爬取', 'error');
        return;
    }
    
    const headers = ['Thread ID', 'Post ID', 'URL', 'Content', 'Likes', 'Replies', 'Date', 'Media Count', 'Media URLs'];
    const rows = [];
    
    crawledData.posts.forEach(thread => {
        thread.items.forEach(post => {
            const mediaUrls = post.media.map(m => m.url).join('; ');
            const row = [
                thread.threadId,
                post.id,
                post.url,
                // Replace tabs/newlines and escape quotes in text for CSV safety
                `"${post.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                post.likeCount,
                post.replyCount,
                post.date,
                post.media.length,
                `"${mediaUrls.replace(/"/g, '""')}"`
            ];
            rows.push(row.join(','));
        });
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n'); // Add BOM (\uFEFF) for Excel Chinese support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `${crawledData.user.username}_threads.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('CSV 導出成功！', 'success');
}
