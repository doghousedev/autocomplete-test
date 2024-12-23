<script>
  import { onMount } from 'svelte';

  let accounts = [];
  let filteredAccounts = [];
  let error = null;
  let isLoading = false;
  let lastFetchTime = null;
  let searchTerm = '';
  let searchTimeout;
  let fetchTime = 0; // Initialize fetch time to 0
  let resultsTable = []; // Array to store results for display
  let fetchLog = []; // Array to store log of fetch results
  let filterCount = 1; // Default filter count

  function debounce(func, wait) {
    return (...args) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const handleSearch = debounce((term) => {
    if (!term.trim()) {
      filteredAccounts = [];
      return;
    }
    
    const searchTermLower = term.toLowerCase();
    filteredAccounts = accounts
      .filter(account => 
        account.account_name.toLowerCase().includes(searchTermLower))
      .sort((a, b) => a.account_name.localeCompare(b.account_name))
      .slice(0, 10); // Limit to 10 results
  }, 300);

  $: {
    handleSearch(searchTerm);
  }

  function validateInput() {
    // Just validate the input, don't generate filters
    if (filterCount < 1) {
        filterCount = 1;
    } else if (filterCount > 10) {
        filterCount = 10;
    }
  }

  function generateFilters(count) {
    if (count <= 1) {
        return ['']; // Return empty filter for all records
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const totalLetters = alphabet.length;
    const lettersPerFilter = Math.ceil(totalLetters / (count - 1)); // Adjust for special chars filter
    const generatedFilters = [];

    // First filter for special characters and numbers
    generatedFilters.push("account_name < 'A'");
    
    // Generate remaining filters
    for (let i = 0; i < count - 1; i++) {
        const startIndex = i * lettersPerFilter;
        const startLetter = alphabet.charAt(startIndex);
        
        if (i === count - 2) { // Last filter
            generatedFilters.push(`account_name >= '${startLetter}'`);
        } else {
            const endIndex = Math.min((i + 1) * lettersPerFilter, totalLetters - 1);
            const endLetter = alphabet.charAt(endIndex);
            generatedFilters.push(`account_name >= '${startLetter}' AND account_name < '${endLetter}'`);
        }
    }

    console.log('Generated Filters:', generatedFilters); // Debug log
    return generatedFilters;
  }

  async function fetchRest({ object, fieldList, filter, sortBy }) {
    let uri; // Declare uri in the outer scope
    try {
      // Properly encode the URL parameters
      const params = new URLSearchParams({
        fieldList,
        filter,
        sortBy
      });
      
      uri = `http://localhost:3000/api/${object}?${params.toString()}`;
      console.log('Fetching:', uri); // Log the actual URL being fetched

      const response = await fetch(uri, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.platform.message.description}`);
      }

      const data = await response.json();

      if (!data?.platform?.record) {
        throw new Error('No records found or invalid data format received');
      }

      // Ensure we return an array
      const records = Array.isArray(data.platform.record) ? data.platform.record : [data.platform.record];

      // Check if we have all records (you might need to adjust this based on your API)
      if (data.platform.hasMore) {
        console.warn('Warning: More records available but not fetched due to pagination');
      }

      return records;
    } catch (e) {
      // Include more context in the error
      throw new Error(`Failed to fetch range with filter ${filter}: ${e.message}\nURL: ${uri}`);
    }
  }

  async function fetchAccountsInParallel() {
    const startTime = performance.now();
    const fetchResults = { successful: 0, failed: 0, records: [] };
    
    try {
        // Generate filters only when needed
        const currentFilters = generateFilters(filterCount);
        console.log('Using filters:', currentFilters);

        const fetchPromises = currentFilters.map(filter =>
            fetchRest({
                object: 'Accounts',
                fieldList: 'id,account_name',
                filter: filter,
                sortBy: 'account_name'
            })
        );

        const results = await Promise.all(fetchPromises);

        results.forEach((result, index) => {
            fetchResults.successful++;
            fetchResults.records.push(...result);
            console.log(`Fetched records for filter: ${currentFilters[index]}, count: ${result.length}`);
        });

        // Sort all records and remove duplicates
        accounts = [...new Set(fetchResults.records)]
            .sort((a, b) => a.account_name.localeCompare(b.account_name));
        
        const endTime = performance.now();
        fetchTime = endTime - startTime;

        // Update the log array reactively
        fetchLog = [...fetchLog, { 
            time: fetchTime, 
            count: accounts.length,
            timestamp: new Date().toLocaleTimeString(),
            successfulFetches: fetchResults.successful,
            failedFetches: fetchResults.failed,
            filtersApplied: filterCount
        }];

    } catch (error) {
        console.error('Error in parallel fetch:', error);
        error = 'Failed to fetch accounts';
    } finally {
        lastFetchTime = new Date().toLocaleTimeString();
        isLoading = false;
    }
  }

  function handleFetchAccounts() {
    isLoading = true;
    fetchAccountsInParallel()
      .catch(err => {
        console.error('Error in fetch:', err);
        error = 'Failed to fetch accounts';
      })
      .finally(() => {
        isLoading = false;
      });
  }

  onMount(() => {
    document.documentElement.style.backgroundColor = '#121212';
    document.body.style.backgroundColor = '#121212';
    document.body.style.color = '#ffffff';
  });
</script>

<main>
  <h1>Accounts</h1>
  
  <div class="search-container">
    <input
      type="text"
      bind:value={searchTerm}
      placeholder="Search accounts..."
      class="search-input"
    />
    {#if searchTerm && filteredAccounts.length > 0}
      <div class="autocomplete-dropdown">
        {#each filteredAccounts as account}
          <div class="autocomplete-item">
            <span class="account-name">{account.account_name}</span>
            <span class="account-id">{account.id}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <label for="filterCount">Number of Filters:</label>
  <input type="number" id="filterCount" bind:value={filterCount} min="1" max="10" on:input={validateInput} />
  <div>
    <p>Current Filters: {generateFilters(filterCount).join(', ')}</p>
  </div>

  {#if lastFetchTime}
    <p class="last-fetch">Last fetched: {lastFetchTime}</p>
  {/if}
  
  {#if error}
    <p class="error">Error: {error}</p>
  {:else if isLoading}
    <p class="loading"></p>
  {:else if accounts.length === 0}
    <p class="no-data">No accounts found</p>
  {/if}

  <button on:click={handleFetchAccounts} disabled={isLoading}>
    Test Fetch
  </button>

  <h2>Fetch Log</h2>
  <table style="visibility: visible;">
    <thead>
      <tr>
        <th>Time (ms)</th>
        <th>Account Count</th>
        <th>Timestamp</th>
        <th>Successful Fetches</th>
        <th>Failed Fetches</th>
        <th>Filters Applied</th>
      </tr>
    </thead>
    <tbody>
      {#each fetchLog as result}
        <tr>
          <td>{result.time.toFixed(2)}</td>
          <td>{result.count}</td>
          <td>{result.timestamp}</td>
          <td>{result.successfulFetches}</td>
          <td>{result.failedFetches}</td>
          <td>{result.filtersApplied}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #121212;
    color: #ffffff;
    font-family: Arial, sans-serif;
    min-height: 100vh;
  }

  main {
    padding: 20px;
  }

  .search-container {
    position: relative;
    margin-bottom: 20px;
  }

  .search-input {
    width: 100%;
    padding: 10px;
    background-color: #2e2e2e;
    border: 1px solid #3e3e3e;
    border-radius: 5px;
    color: #ffffff;
    font-size: 16px;
  }

  .search-input:focus {
    outline: none;
    border-color: #4e4e4e;
  }

  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: #2e2e2e;
    border: 1px solid #3e3e3e;
    border-radius: 0 0 5px 5px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
  }

  .autocomplete-item {
    padding: 10px;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 10px;
    cursor: pointer;
  }

  .autocomplete-item:hover {
    background-color: #3e3e3e;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }

  th, td {
    padding: 10px;
    border: 1px solid #3e3e3e;
    text-align: left;
  }

  th {
    background-color: #2e2e2e;
  }

  .error {
    color: #ff6b6b;
    padding: 10px;
    background-color: rgba(255, 107, 107, 0.1);
    border-radius: 5px;
  }

  .loading, .no-data {
    color: #a0a0a0;
    padding: 20px;
    text-align: center;
  }

  .last-fetch {
    color: #a0a0a0;
    font-size: 0.9em;
    margin-top: 10px;
  }

  h1 {
    color: #ffffff;
    margin-bottom: 20px;
  }
</style>
