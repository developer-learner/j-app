document.addEventListener('DOMContentLoaded', function () {
  const searchBar = document.getElementById('search-bar');
  const entriesList = document.getElementById('entries');
  let currentJournal = 'primary'; // Default value

  // Listen for the custom journalSwitch event to update the current journal
  window.addEventListener('journalSwitch', function (event) {
    currentJournal = event.detail.currentJournal;
    console.log(`Search functionality updated to use journal: ${currentJournal}`);
  });

  function addEditDeleteButtons(entryDate, li, entryId, entry) {
    const now = new Date();
    const timeDifference = (now - entryDate) / (1000 * 60);
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';

    const pinButton = document.createElement('button');
    pinButton.className = 'pin-btn';
    pinButton.innerHTML = entry.pinned ? '📍' : '📌';
    pinButton.title = entry.pinned ? 'Unpin' : 'Pin to top';
    pinButton.onclick = () => togglePin(entryId, !entry.pinned);
    actionsDiv.appendChild(pinButton);

    if (timeDifference <= 60) {
      const editButton = document.createElement('button');
      editButton.className = 'edit-btn';
      editButton.innerHTML = '✏️';
      editButton.title = 'Edit';
      editButton.onclick = () => editEntry(entryId, entry.text, li);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-btn';
      deleteButton.innerHTML = '🗑️';
      deleteButton.title = 'Delete';
      deleteButton.onclick = () => deleteEntry(entryId);

      actionsDiv.appendChild(editButton);
      actionsDiv.appendChild(deleteButton);
    }

    li.appendChild(actionsDiv);
  }

  function editEntry(entryId, currentText, li) {
    const textDiv = li.querySelector('.entry-text');
    if (!textDiv || li.querySelector('.edit-textarea')) return;

    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = currentText;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-save-btn';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-cancel-btn';
    cancelBtn.textContent = 'Cancel';

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'edit-actions';
    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);

    textDiv.classList.add('hidden');
    textDiv.insertAdjacentElement('afterend', textarea);
    textarea.insertAdjacentElement('afterend', actionsDiv);
    textarea.focus();

    const cleanup = () => {
      textarea.remove();
      actionsDiv.remove();
      textDiv.classList.remove('hidden');
    };

    saveBtn.onclick = () => {
      const newText = textarea.value.trim();
      if (!newText) { showToast('Entry cannot be empty.', 'error'); return; }
      const collectionName = (currentJournal === 'primary') ? 'journalEntries' : `${currentJournal}JournalEntries`;
      const db = firebase.firestore();
      db.collection(collectionName).doc(entryId).update({ text: newText })
        .then(() => {
          showToast('Entry updated.', 'success');
          searchBar.dispatchEvent(new Event('input'));
        })
        .catch(error => {
          console.error('Error updating entry:', error);
          showToast('Failed to update entry.', 'error');
          cleanup();
        });
    };

    cancelBtn.onclick = cleanup;
  }

  function deleteEntry(entryId) {
    const collectionName = (currentJournal === 'primary') ? 'journalEntries' : `${currentJournal}JournalEntries`;
    if (confirm('Are you sure you want to delete this entry?')) {
      const db = firebase.firestore();
      db.collection(collectionName).doc(entryId).delete()
        .then(() => {
          showToast('Entry deleted.', 'info');
          searchBar.dispatchEvent(new Event('input'));
        })
        .catch(error => {
          console.error('Error deleting entry:', error);
          showToast('Failed to delete entry.', 'error');
        });
    }
  }

  function togglePin(entryId, pinned) {
    const collectionName = (currentJournal === 'primary') ? 'journalEntries' : `${currentJournal}JournalEntries`;
    const db = firebase.firestore();
    db.collection(collectionName).doc(entryId).update({ pinned })
      .then(() => {
        showToast(pinned ? 'Entry pinned to top.' : 'Entry unpinned.', 'info');
        searchBar.dispatchEvent(new Event('input'));
      })
      .catch(error => {
        console.error('Error toggling pin:', error);
        showToast('Failed to update pin.', 'error');
      });
  }

  function renderMarkdown(text) {
    const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return escaped
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }

  let searchTimeout;

  const dateFilter = document.getElementById('date-filter');

  searchBar.addEventListener('input', function () {
    clearTimeout(searchTimeout);

    if (!searchBar.value.trim() && !dateFilter.value) {
      window.dispatchEvent(new CustomEvent('searchCleared'));
      return;
    }

    searchTimeout = setTimeout(() => {
      const searchTerm = searchBar.value.toLowerCase();
      const filterDate = dateFilter.value;
      const collectionName = (currentJournal === 'primary') ? 'journalEntries' : `${currentJournal}JournalEntries`;

      const db = firebase.firestore();
      db.collection(collectionName)
        .orderBy('timestamp', 'desc')
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
            const entryDateStr = entryDate.toISOString().split('T')[0];
            if (filterDate && entryDateStr !== filterDate) return;
            const formattedDate = entryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toLowerCase();
            const entryText = entry.text.toLowerCase();

            if (entryText.includes(searchTerm) || formattedDate.includes(searchTerm)) {
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
                <div class="entry-pin">${entry.pinned ? '📍' : ''}</div>
                <div class="timestamp">${entryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}</div>
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
    }, 300);
  });
});
