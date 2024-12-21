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

  async function fetchRest({ object, fieldList, filter, sortBy }) {
    isLoading = true;
    error = null;
    
    try {
      const uri = `http://localhost:3000/api/${object}?fieldList=${fieldList}&filter=${filter}&sortBy=${sortBy}`;
      const response = await fetch(uri, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data?.platform?.record) {
        throw new Error('Invalid data format received');
      }

      return data.platform.record; // Return the records instead of assigning directly
    } catch (e) {
      error = e.message;
      return []; // Return an empty array in case of error
    } finally {
      isLoading = false;
    }
  }

  async function fetchAccountsInParallel() {
    const filters = [
      "account_name >= 'A' AND account_name <= 'C'",
      "account_name >= 'D' AND account_name <= 'G'",
      "account_name >= 'H' AND account_name <= 'J'",
      "account_name >= 'K' AND account_name <= 'O'",
      "account_name >= 'P' AND account_name <= 'R'",
      "account_name >= 'S' AND account_name <= 'T'",
      "account_name >= 'U' AND account_name <= 'Z'",
      "account_name >= '0' AND account_name <= '9'"
    ];

    const fetchPromises = filters.map(filter => 
      fetchRest({
        object: 'Accounts',
        fieldList: 'id,account_name',
        filter: filter,
        sortBy: 'account_name'
      })
    );

    // Start the timer
    const startTime = performance.now();

    // Wait for all fetches to complete
    const results = await Promise.all(fetchPromises);
    
    // Combine and sort the results
    accounts = results.flat().sort((a, b) => a.account_name.localeCompare(b.account_name));
    lastFetchTime = new Date().toLocaleTimeString();

    // Stop the timer and calculate elapsed time
    const endTime = performance.now();
    fetchTime = endTime - startTime;

    // Update the log array reactively
    fetchLog = [...fetchLog, { 
      time: fetchTime, 
      count: accounts.length,
      timestamp: new Date().toLocaleTimeString()
    }];
  }

  function handleFetchAccounts() {
    isLoading = true; // Disable button
    fetchAccountsInParallel().finally(() => {
      isLoading = false; // Re-enable button after fetch
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
    Fetch Accounts
  </button>

  <h2>Fetch Results</h2>
  <table style="visibility: visible;">
    <thead>
      <tr>
        <th>Time (ms)</th>
        <th>Account Count</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <tbody>
      {#each fetchLog as result}
        <tr>
          <td>{result.time.toFixed(2)}</td>
          <td>{result.count}</td>
          <td>{result.timestamp}</td>
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
