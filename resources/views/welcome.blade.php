<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Database</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">

    <div class="max-w-7xl mx-auto px-4 py-8">

        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-white">Stock Database</h1>
            <p class="text-gray-400 mt-1">Browse and search your stock universe</p>
        </div>

        <!-- Search Bar -->
        <div class="mb-6 flex gap-3">
            <input
                id="searchInput"
                type="text"
                placeholder="Search by name, ticker, or describe what you're looking for..."
                class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <select id="modeSelect" class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500">
                <option value="hybrid">Hybrid</option>
                <option value="keyword">Keyword</option>
                <option value="semantic">Semantic</option>
            </select>
            <button id="searchBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                Search
            </button>
            <button id="clearBtn" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors hidden">
                Clear
            </button>
        </div>

        <!-- Status bar -->
        <div id="statusBar" class="mb-4 text-sm text-gray-400"></div>

        <!-- Table -->
        <div class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                        <th class="text-left px-4 py-3">Ticker</th>
                        <th class="text-left px-4 py-3">Name</th>
                        <th class="text-left px-4 py-3">Sector</th>
                        <th class="text-right px-4 py-3">Price</th>
                        <th class="text-right px-4 py-3">Market Cap</th>
                        <th class="text-left px-4 py-3">Tags</th>
                        <th class="text-right px-4 py-3" id="similarityHeader" style="display:none">Similarity</th>
                    </tr>
                </thead>
                <tbody id="stockTable">
                    <tr>
                        <td colspan="7" class="text-center py-12 text-gray-500">Loading stocks...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div id="pagination" class="mt-4 flex items-center justify-between text-sm text-gray-400"></div>

        <!-- Detail Modal -->
        <div id="modal" class="fixed inset-0 bg-black/70 items-center justify-center z-50 p-4" style="display:none">
            <div class="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div class="flex items-start justify-between p-6 border-b border-gray-800">
                    <div>
                        <h2 id="modalTicker" class="text-2xl font-bold text-white"></h2>
                        <p id="modalName" class="text-gray-400 mt-0.5"></p>
                    </div>
                    <button id="modalClose" class="text-gray-500 hover:text-white text-2xl leading-none ml-4">&times;</button>
                </div>
                <div class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Sector</p>
                            <p id="modalSector" class="text-white"></p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Price</p>
                            <p id="modalPrice" class="text-white text-lg font-semibold"></p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Market Cap</p>
                            <p id="modalMarketCap" class="text-white"></p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Tags</p>
                            <p id="modalTags" class="text-white"></p>
                        </div>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</p>
                        <p id="modalDescription" class="text-gray-300 leading-relaxed"></p>
                    </div>
                    <div id="modalNotesSection">
                        <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                        <p id="modalNotes" class="text-gray-300 leading-relaxed"></p>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <script>
        let currentPage = 1;

        const tableBody = document.getElementById('stockTable');
        const statusBar = document.getElementById('statusBar');
        const pagination = document.getElementById('pagination');
        const similarityHeader = document.getElementById('similarityHeader');
        const modal = document.getElementById('modal');
        const clearBtn = document.getElementById('clearBtn');

        function formatPrice(price) {
            if (price == null) return '—';
            return '$' + parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function formatMarketCap(cap) {
            if (cap == null) return '—';
            if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T';
            if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(1) + 'B';
            if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(1) + 'M';
            return '$' + cap.toLocaleString();
        }

        function renderRows(stocks, showSimilarity) {
            similarityHeader.style.display = showSimilarity ? '' : 'none';
            if (stocks.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-12 text-gray-500">No stocks found.</td></tr>';
                return;
            }
            tableBody.innerHTML = stocks.map(stock => `
                <tr class="border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors" data-id="${stock.id}">
                    <td class="px-4 py-3 font-mono font-bold text-blue-400">${stock.ticker}</td>
                    <td class="px-4 py-3 text-white">${stock.name}</td>
                    <td class="px-4 py-3 text-gray-400">${stock.sector || '—'}</td>
                    <td class="px-4 py-3 text-right font-mono">${formatPrice(stock.price)}</td>
                    <td class="px-4 py-3 text-right text-gray-400">${formatMarketCap(stock.market_cap)}</td>
                    <td class="px-4 py-3">${(stock.tags || []).map(t => `<span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded mr-1">${t}</span>`).join('')}</td>
                    <td class="px-4 py-3 text-right font-mono text-green-400" style="display:${showSimilarity ? '' : 'none'}">${stock.similarity != null ? (stock.similarity * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
                <tr class="border-b border-gray-800/20 hover:bg-gray-800/20 cursor-pointer transition-colors description-row" data-id="${stock.id}">
                    <td colspan="7" class="px-4 pb-3 text-sm text-gray-500 italic">${stock.description ? stock.description.slice(0, 180) + (stock.description.length > 180 ? '…' : '') : ''}</td>
                </tr>
            `).join('');

            tableBody.querySelectorAll('tr[data-id]').forEach(row => {
                row.addEventListener('click', () => {
                    const stock = stocks.find(s => String(s.id) === row.dataset.id);
                    if (stock) openModal(stock);
                });
            });
        }

        async function loadStocks(page) {
            currentPage = page;
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-12 text-gray-500">Loading...</td></tr>';
            pagination.innerHTML = '';
            try {
                const res = await fetch(`/api/v1/stocks?page=${page}`);
                const data = await res.json();
                renderRows(data.data, false);
                statusBar.textContent = `${data.total} stocks total`;
                renderPagination(data);
            } catch (e) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-red-400">Error: ${e.message}</td></tr>`;
            }
        }

        async function doSearch() {
            const q = document.getElementById('searchInput').value.trim();
            if (!q) { loadStocks(1); return; }
            const mode = document.getElementById('modeSelect').value;
            clearBtn.classList.remove('hidden');
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-12 text-gray-500">Searching...</td></tr>';
            pagination.innerHTML = '';
            try {
                const res = await fetch(`/api/v1/stocks/search?q=${encodeURIComponent(q)}&mode=${mode}`);
                const data = await res.json();
                renderRows(data.results, mode !== 'keyword');
                statusBar.textContent = `${data.results.length} result${data.results.length !== 1 ? 's' : ''} · mode: ${data.mode}`;
            } catch (e) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-red-400">Error: ${e.message}</td></tr>`;
            }
        }

        function renderPagination(data) {
            if (data.last_page <= 1) { pagination.innerHTML = ''; return; }
            const prev = data.current_page > 1
                ? `<button onclick="loadStocks(${data.current_page - 1})" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">← Prev</button>`
                : '<span></span>';
            const next = data.current_page < data.last_page
                ? `<button onclick="loadStocks(${data.current_page + 1})" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">Next →</button>`
                : '<span></span>';
            pagination.innerHTML = `${prev}<span>Page ${data.current_page} of ${data.last_page}</span>${next}`;
        }

        function openModal(stock) {
            document.getElementById('modalTicker').textContent = stock.ticker;
            document.getElementById('modalName').textContent = stock.name;
            document.getElementById('modalSector').textContent = stock.sector || '—';
            document.getElementById('modalPrice').textContent = formatPrice(stock.price);
            document.getElementById('modalMarketCap').textContent = formatMarketCap(stock.market_cap);
            document.getElementById('modalTags').textContent = (stock.tags || []).join(', ') || '—';
            document.getElementById('modalDescription').textContent = stock.description || '—';
            const notesSection = document.getElementById('modalNotesSection');
            document.getElementById('modalNotes').textContent = stock.notes || '';
            notesSection.style.display = stock.notes ? '' : 'none';
            modal.style.display = 'flex';
        }

        document.getElementById('modalClose').addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        document.getElementById('searchBtn').addEventListener('click', doSearch);
        document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
        clearBtn.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            clearBtn.classList.add('hidden');
            loadStocks(1);
        });

        loadStocks(1);
    </script>
</body>
</html>
