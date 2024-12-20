<script>
  import { onMount } from 'svelte';

  let accounts = [];
  let error = null;

  async function fetchAccounts() {
    try {
      const obj = {
        uri: 'http://localhost:3000/api/Accounts?fieldList=account_name,id&sortBy=account_name', // Use the Express server endpoint
        method: 'GET'
      };
      const response = await fetch(obj.uri, {
        method: obj.method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      accounts = data.objects || [];
      console.log('Accounts data:', data);
    } catch (e) {
      error = e.message;
      console.error('Error fetching accounts:', e);
    }
  }

  onMount(() => {
    fetchAccounts();
  });
</script>

<main>
  <h1>Accounts</h1>
  
  {#if error}
    <p class="error">Error: {error}</p>
  {:else if accounts.length === 0}
    <p>Loading accounts...</p>
  {:else}
    <ul>
      {#each accounts as account}
        <li>
          <strong>{account.account_name}</strong>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .error {
    color: red;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
</style>
