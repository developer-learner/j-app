document.addEventListener('DOMContentLoaded', function () {
  const searchBar = document.getElementById('search-bar');
  const entriesList = document.getElementById('entries');
  let currentJournal = 'primary';

  window.addEventListener('journalSwitch', function (event) {
    currentJournal = event.detail.currentJournal;
  });

  let searchTimeout;

  const dateFilter = document.getElementById('date-filter');

  function triggerSearch() {
    if (!searchBar.value.trim() && !dateFilter.value) {
      window.dispatchEvent(new CustomEvent('searchCleared'));
      return;
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 300);
  }

  searchBar.addEventListener('input', triggerSearch);
  dateFilter.addEventListener('change', triggerSearch);

  function getCollectionName(name) {
    return name === 'primary' ? 'journalEntries' : `${name}JournalEntries`;
  }

  function doSearch() {
    const searchTerm = searchBar.value.toLowerCase();
    const filterDate = dateFilter.value;
    const collectionName = getCollectionName(currentJournal);

    const db = firebase.firestore();
    db.collection(collectionName)
      .where('userId', '==', window.currentUserUid)
      .get()
      .then(snapshot => {
        const docs = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, data: doc.data() }));
        docs.sort((a, b) => {
          if (a.data.pinned && !b.data.pinned) return -1;
          if (!a.data.pinned && b.data.pinned) return 1;
          return (b.data.timestamp?.toDate() || 0) - (a.data.timestamp?.toDate() || 0);
        });

        entriesList.innerHTML = '';
        let previousDate = null;

        docs.forEach(({ id, data: entry }) => {
          const entryDate = entry.timestamp.toDate();
          const entryDateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
          if (filterDate && entryDateStr !== filterDate) return;
          const formattedDate = entryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          const entryText = entry.text.toLowerCase();

          if (entryText.includes(searchTerm) || formattedDate.toLowerCase().includes(searchTerm)) {
            if (previousDate !== formattedDate) {
              const dateBanner = document.createElement('li');
              dateBanner.className = 'entry-day';
              dateBanner.textContent = formattedDate;
              entriesList.appendChild(dateBanner);
              previousDate = formattedDate;
            }

            const li = document.createElement('li');
            li.className = `entry${entry.pinned ? ' pinned' : ''}`;
            li.innerHTML = `
              ${entry.pinned ? '<div class="entry-pin">📍</div>' : ''}
              <div class="timestamp">${entryDate.getHours().toString().padStart(2, '0')}:${entryDate.getMinutes().toString().padStart(2, '0')}</div>
              <div class="entry-text">${renderMarkdown(entry.text)}</div>
            `;
            addEditDeleteButtons(entryDate, li, id, entry);
            entriesList.appendChild(li);
          }
        });
      })
      .catch(error => {
        console.error('Error searching entries:', error);
        entriesList.innerHTML = '<li>Error searching entries. Please try again later.</li>';
      });
  }
});
