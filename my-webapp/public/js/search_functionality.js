document.addEventListener('DOMContentLoaded', function () {
  const searchBar = document.getElementById('search-bar');
  const entriesList = document.getElementById('entries');
  let currentJournal = 'primary'; // Default value

  // Listen for the custom journalSwitch event to update the current journal
  window.addEventListener('journalSwitch', function (event) {
    currentJournal = event.detail.currentJournal;
    console.log(`Search functionality updated to use journal: ${currentJournal}`);
  });

  searchBar.addEventListener('input', function () {
    const searchTerm = searchBar.value.toLowerCase();

    // Ensure we are querying the correct journal collection
    const collectionName = (currentJournal === 'primary') ? 'journalEntries' : `${currentJournal}JournalEntries`;

    console.log(`Searching in collection: ${collectionName}`); // Log the collection being searched

    const db = firebase.firestore();
    db.collection(collectionName)
      .orderBy('timestamp', 'desc')
      .get()
      .then(snapshot => {
        entriesList.innerHTML = '';  // Clear previous results
        let previousDate = null;

        snapshot.forEach(doc => {
          const entry = doc.data();
          const entryDate = entry.timestamp.toDate();
          const formattedDate = entryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toLowerCase();
          const entryText = entry.text.toLowerCase();

          // Check if search term matches text or date
          if (entryText.includes(searchTerm) || formattedDate.includes(searchTerm)) {
            if (previousDate !== formattedDate) {
              const dateBanner = document.createElement('li');
              dateBanner.className = 'entry-day';
              dateBanner.textContent = formattedDate;
              entriesList.appendChild(dateBanner);
              previousDate = formattedDate;
            }

            const li = document.createElement('li');
            li.className = 'entry';
            li.innerHTML = `
              <div class="timestamp">${entryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}</div>
              <div class="entry-text">${entry.text}</div>
            `;
            entriesList.appendChild(li);
          }
        });
      })
      .catch(error => {
        console.error('Error searching entries:', error);
        entriesList.innerHTML = '<li>Error searching entries. Please try again later.</li>';
      });
  });
});
