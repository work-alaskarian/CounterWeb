<script>
  import './styles/DataTable.css';
  import { createEventDispatcher } from 'svelte';
  
  
  const dispatch = createEventDispatcher();
  
  export let data = [];
  export let columns = [];
  export let title = "جدول البيانات"; // Translate default title
  
  let filteredData = [...data];
  let sortColumn = '';
  let sortDirection = 'asc';
  let searchQuery = '';
  let dateFilter = '';
  let statusFilter = '';
  let currentPage = 1;
  let itemsPerPage = 10;
  
  // Sample data if none provided
  const sampleData = [
    { id: 1, date: '2024-01-15', location: 'Main Entrance', count: 1250, status: 'Active', category: 'High Traffic' },
    { id: 2, date: '2024-01-15', location: 'Second Floor', count: 890, status: 'Active', category: 'Medium Traffic' },
    { id: 3, date: '2024-01-15', location: 'Warehouse A', count: 320, status: 'Active', category: 'Low Traffic' },
    { id: 4, date: '2024-01-14', location: 'Office Area', count: 650, status: 'Inactive', category: 'Medium Traffic' },
    { id: 5, date: '2024-01-14', location: 'Loading Dock', count: 480, status: 'Active', category: 'Medium Traffic' },
    { id: 6, date: '2024-01-14', location: 'Cafeteria', count: 720, status: 'Active', category: 'High Traffic' },
    { id: 7, date: '2024-01-13', location: 'Main Entrance', count: 1180, status: 'Active', category: 'High Traffic' },
    { id: 8, date: '2024-01-13', location: 'Second Floor', count: 820, status: 'Maintenance', category: 'Medium Traffic' },
    { id: 9, date: '2024-01-12', location: 'Warehouse A', count: 290, status: 'Active', category: 'Low Traffic' },
    { id: 10, date: '2024-01-12', location: 'Office Area', count: 590, status: 'Active', category: 'Medium Traffic' },
    { id: 11, date: '2024-01-11', location: 'Loading Dock', count: 440, status: 'Active', category: 'Medium Traffic' },
    { id: 12, date: '2024-01-11', location: 'Cafeteria', count: 680, status: 'Active', category: 'Medium Traffic' },
    { id: 13, date: '2024-01-10', location: 'Main Entrance', count: 1320, status: 'Active', category: 'High Traffic' },
    { id: 14, date: '2024-01-10', location: 'Second Floor', count: 950, status: 'Active', category: 'High Traffic' },
    { id: 15, date: '2024-01-09', location: 'Warehouse A', count: 310, status: 'Inactive', category: 'Low Traffic' }
  ];
  
  const sampleColumns = [
    { key: 'id', label: 'المعرف', sortable: true },
    { key: 'date', label: 'التاريخ', sortable: true },
    { key: 'location', label: 'الموقع', sortable: true },
    { key: 'count', label: 'العدد', sortable: true },
    { key: 'status', label: 'الحالة', sortable: true },
    { key: 'category', label: 'الفئة', sortable: true }
  ];
  
  // Use provided data or sample data
  $: currentData = data.length > 0 ? data : sampleData;
  $: currentColumns = columns.length > 0 ? columns : sampleColumns;
  
  // Filter and sort logic
  $: {
    let filtered = [...currentData];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    // Apply date filter
    if (dateFilter) {
      filtered = filtered.filter(item => item.date >= dateFilter);
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        } else {
          aVal = aVal.toString().toLowerCase();
          bVal = bVal.toString().toLowerCase();
          if (sortDirection === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          }
        }
      });
    }
    
    filteredData = filtered;
  }
  
  // Pagination logic
  $: totalPages = Math.ceil(filteredData.length / itemsPerPage);
  $: paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  function handleSort(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }
  
  function exportData(format) {
    dispatch('export', { data: filteredData, format });
    
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'json') {
      exportToJSON();
    }
  }
  
  function exportToCSV() {
    const headers = currentColumns.map(col => col.label).join(',');
    const rows = filteredData.map(item => 
      currentColumns.map(col => item[col.key]).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    downloadFile(csv, 'data-export.csv', 'text/csv');
  }
  
  function exportToJSON() {
    const json = JSON.stringify(filteredData, null, 2);
    downloadFile(json, 'data-export.json', 'application/json');
  }
  
  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function resetFilters() {
    searchQuery = '';
    dateFilter = '';
    statusFilter = '';
    sortColumn = '';
    currentPage = 1;
  }
</script>

<div class="data-table-container">
  <div class="table-header">
    <h3>{title}</h3>
    <div class="table-actions">
      <button class="export-btn" on:click={() => exportData('csv')}>
        📊 تصدير CSV
      </button>
      <button class="export-btn" on:click={() => exportData('json')}>
        📋 تصدير JSON
      </button>
    </div>
  </div>
  
  <div class="filters">
    <div class="filter-group">
      <input
        type="text"
        placeholder="بحث..."
        bind:value={searchQuery}
        class="filter-input"
      />
    </div>
    
    <div class="filter-group">
      <input
        type="date"
        bind:value={dateFilter}
        class="filter-input"
      />
    </div>
    
    <div class="filter-group">
      <select bind:value={statusFilter} class="filter-select">
        <option value="">جميع الحالات</option>
        <option value="Active">نشط</option>
        <option value="Inactive">غير نشط</option>
        <option value="Maintenance">صيانة</option>
      </select>
    </div>
    
    <button class="reset-btn" on:click={resetFilters}>إعادة تعيين</button>
  </div>
  
  <div class="table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          {#each currentColumns as column}
            <th
              class="sortable {sortColumn === column.key ? 'sorted' : ''}"
              on:click={() => column.sortable && handleSort(column.key)}
            >
              {column.label}
              {#if sortColumn === column.key}
                <span class="sort-indicator">
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each paginatedData as item}
          <tr>
            {#each currentColumns as column}
              <td class={column.key}>
                {#if column.key === 'status'}
                  <span class="status-badge status-{item[column.key].toLowerCase()}">
                    {item[column.key]}
                  </span>
                {:else if column.key === 'count'}
                  {item[column.key].toLocaleString()}
                {:else}
                  {item[column.key]}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  
  {#if totalPages > 1}
    <div class="pagination">
      <button
        class="page-btn"
        on:click={() => currentPage = Math.max(1, currentPage - 1)}
        disabled={currentPage === 1}
      >
        ‹ السابق
      </button>
      
      <div class="page-numbers">
        {#each Array(totalPages).fill().map((_, i) => i + 1) as page}
          <button
            class="page-btn {page === currentPage ? 'active' : ''}"
            on:click={() => currentPage = page}
          >
            {page}
          </button>
        {/each}
      </div>
      
      <button
        class="page-btn"
        on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        التالي ›
      </button>
    </div>
  {/if}
  
  <div class="table-info">
    عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filteredData.length)} من أصل {filteredData.length} إدخال
  </div>
</div>

