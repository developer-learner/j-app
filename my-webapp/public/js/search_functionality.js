// Real-time Firestore instance
const db = firebase.firestore();
const searchBar = document.getElementById('search-bar');

// Search functionality
searchBar.addEventListener('input', function () {
  const searchText = searchBar.value.toLowerCase();
  db.collection('journalEntries').orderBy('timestamp', 'desc').get()
  .then(snapshot => {
    const entriesList = document.getElementById('entries');
    entriesList.innerHTML = '';  // Clear the list
    let currentDay = '';

    snapshot.forEach(doc => {
      const entry = doc.data();
      const entryId = doc.id;
      const entryDate = entry.timestamp.toDate();

      // Format date for the banner (Monday, Oct 17)
      const dayString = entryDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Format time for the journal entry (12:34:30 PM)
      const timeString = entryDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });

      // Check if entry matches search text
      if (entry.text.toLowerCase().includes(searchText) || dayString.toLowerCase().includes(searchText) || timeString.toLowerCase().includes(searchText)) {
        // Check if the current entry is on a new day, and add a new date header if needed
        if (currentDay !== dayString) {
          currentDay = dayString;
          const dayHeader = document.createElement('li');
          dayHeader.className = 'entry-day';
          dayHeader.textContent = currentDay;
          entriesList.appendChild(dayHeader);
        }

        // Add the journal entry under the date header
        const li = document.createElement('li');
        li.className = 'entry';
        li.innerHTML = `
          <div class="timestamp">${timeString}</div>
          <div class="entry-text">${entry.text}</div>
        `;

        entriesList.appendChild(li);
      }
    });
  });
});
