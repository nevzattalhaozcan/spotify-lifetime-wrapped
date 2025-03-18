// Define global variables
let data = []; // Holds the raw or refined data
let dailyDataCache = {}; // Cache for daily data
let monthlyDataCache = null; // Cache for monthly data
let userListeningData = []; // Holds the refined user listening data

document.addEventListener('DOMContentLoaded', () => {
  // Initialize tooltips properly
  setTimeout(() => {
    $('[data-toggle="tooltip"]').tooltip({
      trigger: 'hover',
      container: 'body',
      boundary: 'window'
    });
  }, 100);

  function updateTooltips(language) {
    $('[data-toggle="tooltip"]').tooltip('dispose').each(function() {
      const titleKey = `data-title-${language}`;
      const newTitle = $(this).attr(titleKey);
      if (newTitle) {
        $(this).attr('title', newTitle);
      }
    }).tooltip({
      trigger: 'hover',
      container: 'body',
      boundary: 'window'
    });
  }

  // Modify the switchLanguage function to include tooltip updates
  const originalSwitchLanguage = window.switchLanguage;
  window.switchLanguage = function(language) {
    if (originalSwitchLanguage) {
      originalSwitchLanguage(language);
    }
    updateTooltips(language);
    if (data.length > 0) {
      displayCharts(data); // This will update chart titles
    }
  };

  const fileUpload = document.getElementById('file-upload');
  const fileChosen = document.getElementById('file-chosen');
  const analyzeButton = document.getElementById('analyze-button');
  const loadingIndicator = document.getElementById('loading-indicator');
  const resultsSection = document.getElementById('results-section');
  const trackStats = document.getElementById('track-stats');
  const albumStats = document.getElementById('album-stats');
  const artistStats = document.getElementById('artist-stats');
  const podcastStats = document.getElementById('podcast-stats');
  const languageEn = document.getElementById('language-en');
  const languageTr = document.getElementById('language-tr');
  const firstRecordElement = document.getElementById('first-record');
  const lastRecordElement = document.getElementById('last-record');
  const totalRecordsElement = document.getElementById('total-records');
  const accountUsageDurationElement = document.getElementById('account-usage-duration');
  const totalPlayTimeElement = document.getElementById('total-play-time');
  const filterButton = document.getElementById('filter-button');
  const dataTypeSelect = document.getElementById('data-type');
  const timePeriodSelect = document.getElementById('time-period');
  const monthSelect = document.getElementById('month');
  const yearSelect = document.getElementById('year');
  const detailedStats = document.getElementById('detailed-stats');
  const mostListenedDayElement = document.getElementById('most-listened-day');
  const firstRecordInDataElement = document.getElementById('first-record-in-data');
  let selectedLanguage = 'tr'; // Changed default to Turkish

  // Initial language setup
  setTimeout(() => {
    switchLanguage('tr');
    // Update button states
    if (languageTr) languageTr.classList.add('active');
    if (languageEn) languageEn.classList.remove('active');
  }, 100);

  // Populate year dropdown
  const currentYear = new Date().getFullYear();
  for (let year = 2008; year <= currentYear; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (yearSelect) yearSelect.appendChild(option);
  }

  if (fileUpload && fileChosen) {
    fileUpload.addEventListener('change', () => {
      const files = Array.from(fileUpload.files);
      const noFileSelectedText = selectedLanguage === 'en' ? 'No file selected' : 'Dosya seçilmedi';
      fileChosen.textContent = files.length === 0 ? noFileSelectedText : files.map((file) => file.name).join(', ');
      if (analyzeButton) analyzeButton.style.display = files.length === 0 ? 'none' : 'inline-block';
    });
  }

  if (analyzeButton) {
    analyzeButton.addEventListener('click', () => {
      const files = fileUpload.files;
      if (files.length === 0) {
        console.error('Please upload at least one JSON or ZIP file.');
        return;
      }
      if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
      } else {
        console.error('loadingIndicator is null');
      }
      if (resultsSection) {
        resultsSection.style.display = 'none';
      } else {
        console.error('resultsSection is null');
      }
      const promises = Array.from(files).map((file) => {
        if (file.name.endsWith('.zip')) {
          return extractZipFile(file);
        } else {
          return readFileAsJson(file);
        }
      });
      Promise.all(promises)
        .then((dataArrays) => {
          userListeningData = dataArrays.flat(); // Store the refined data globally
          data = userListeningData; // Add this line to populate the global data variable
          displaySummary(userListeningData, selectedLanguage);
          displayStats(userListeningData);
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
          if (resultsSection) {
            resultsSection.style.display = 'block';
            // Show tracks tab by default
            showTab('track-section');
            // Add active class to tracks button
            const tracksButton = document.querySelector('button[onclick="showTab(\'track-section\')"]');
            if (tracksButton) {
              tracksButton.classList.add('active');
            }
            // Dispatch event to show search
            document.dispatchEvent(new Event('analysisComplete'));
          }
        })
        .catch((error) => {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          } else {
            console.error('loadingIndicator is null');
          }
          console.error('Error analyzing data: ' + error.message);
          if (resultsSection) {
            resultsSection.innerHTML = `<p>Error analyzing data: ${error.message}</p>`;
            resultsSection.style.display = 'block';
          } else {
            console.error('resultsSection is null');
          }
        });
    });
  }

  if (filterButton) {
    filterButton.addEventListener('click', () => {
      const dataType = dataTypeSelect.value;
      const timePeriod = timePeriodSelect.value;
      const month = monthSelect.value;
      const year = yearSelect.value || 'all';
      const filteredData = filterData(data, dataType, timePeriod, month, year);
      displayFilteredStats(filteredData, dataType);
    });
  }

  function readFileAsJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }

  function extractZipFile(file) {
    return new Promise((resolve, reject) => {
      const zip = new JSZip();
      zip.loadAsync(file)
        .then((zip) => {
          const jsonPromises = [];
          zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.name.endsWith('.json')) {
              jsonPromises.push(zipEntry.async('string').then((content) => JSON.parse(content)));
            }
          });
          return Promise.all(jsonPromises);
        })
        .then((jsonDataArrays) => resolve(jsonDataArrays.flat()))
        .catch((error) => reject(error));
    });
  }

  function displaySummary(data, language) {
    const firstRecord = findFirstPlayedRecord(data);
    const lastRecord = findLastPlayedRecord(data);
    const accountUsageDuration = calculateDurationBetweenTimestamps(firstRecord.ts, lastRecord.ts, language);
    const totalPlayTime = calculateTotalPlayTime(data);
    const mostListenedDay = findMostListenedDay(data);
    const playTime = selectedLanguage === 'tr'
      ? firstRecord.ms_played < 60000 
        ? `${Math.floor(firstRecord.ms_played / 1000)} saniye` 
        : `${Math.floor(firstRecord.ms_played / 60000)} dakika`
      : firstRecord.ms_played < 60000 
        ? `${Math.floor(firstRecord.ms_played / 1000)} seconds` 
        : `${Math.floor(firstRecord.ms_played / 60000)} minutes`;
    const firstRecordDetails = `
      ${firstRecord.master_metadata_track_name} - 
      ${firstRecord.master_metadata_album_artist_name} - 
      ${firstRecord.master_metadata_album_album_name} - 
      ${playTime}
    `;
    if (firstRecordElement) {
      firstRecordElement.textContent = language === 'en' 
        ? `First record date and time: ${formatTimestamp(firstRecord.ts, 'en')}` 
        : `İlk kayıt tarihi ve saati: ${formatTimestamp(firstRecord.ts, 'tr')}`;
    } else {
      console.error('firstRecordElement is null');
    }
    if (lastRecordElement) {
      lastRecordElement.textContent = language === 'en' 
        ? `Last record date and time: ${formatTimestamp(lastRecord.ts, 'en')}` 
        : `Son kayıt tarihi ve saati: ${formatTimestamp(lastRecord.ts, 'tr')}`;
    } else {
      console.error('lastRecordElement is null');
    }
    if (totalRecordsElement) {
      totalRecordsElement.textContent = language === 'en' 
        ? `Total records: ${data.length}` 
        : `Toplam kayıt sayısı: ${data.length}`;
    } else {
      console.error('totalRecordsElement is null');
    }
    if (accountUsageDurationElement) {
      accountUsageDurationElement.textContent = language === 'en' 
        ? `Account usage duration: ${accountUsageDuration}` 
        : `Hesap kullanım süresi: ${accountUsageDuration}`;
    } else {
      console.error('accountUsageDurationElement is null');
    }
    if (totalPlayTimeElement) {
      totalPlayTimeElement.textContent = language === 'en' 
        ? `Total play time: ${totalPlayTime} minutes` 
        : `Toplam oynatma süresi: ${totalPlayTime} dakika`;
    } else {
      console.error('totalPlayTimeElement is null');
    }
    if (mostListenedDayElement) {
      mostListenedDayElement.textContent = language === 'en' 
        ? `Most listened day: ${mostListenedDay.date}, you listened to Spotify for ${mostListenedDay.minutes} minutes` 
        : `En çok Spotify dinlenen gün: ${mostListenedDay.date}, ${mostListenedDay.minutes} dakika dinlediniz`;
    } else {
      console.error('mostListenedDayElement is null');
    }
    if (firstRecordInDataElement) {
      firstRecordInDataElement.textContent = language === 'en' 
        ? `First record in the data: ${firstRecordDetails}` 
        : `Verilerdeki ilk kayıt: ${firstRecordDetails}`;
    } else {
      console.error('firstRecordInDataElement is null');
    }
  }

  function displayStats(data) {
    const trackStatsData = calculateTrackStats(data);
    const albumStatsData = calculateAlbumStats(data);
    const artistStatsData = calculateArtistStats(data);
    const podcastStatsData = calculatePodcastStatsByEpisode(data);
    const headers = selectedLanguage === 'en'
      ? ['Name', 'Artist', 'Album', 'Minutes Played']
      : ['Adı', 'Sanatçı', 'Albüm', 'Oynatma Süresi (Dakika)'];
    populateTable(trackStats, getTopItems(trackStatsData, 10, ['artistName', 'albumName']), headers);
    populateTable(albumStats, getTopItems(albumStatsData, 10, ['artistName']),
      selectedLanguage === 'en'
        ? ['Name', 'Artist', 'Minutes Played']
        : ['Adı', 'Sanatçı', 'Oynatma Süresi (Dakika)']
    );
    populateTable(artistStats, getTopItems(artistStatsData, 10),
      selectedLanguage === 'en' ? ['Name', 'Minutes Played'] : ['Adı', 'Oynatma Süresi (Dakika)']
    );
    populateTable(podcastStats, getTopItems(podcastStatsData, 10, ['showName']),
      selectedLanguage === 'en' ? ['Show Name', 'Minutes Played'] : ['Gösteri Adı', 'Oynatma Süresi (Dakika)']
    );
    displayCharts(data);
  }

  function displayFilteredStats(filteredData, dataType) {
    if (filteredData.length === 0) {
      detailedStats.innerHTML = selectedLanguage === 'en'
        ? '<tr><td colspan="4">No data for the selected filters.</td></tr>'
        : '<tr><td colspan="4">Seçilen filtreler için veri yok.</td></tr>';
      return;
    }
    let filteredStats;
    let headers;
    switch (dataType) {
      case 'track':
        filteredStats = calculateTrackStats(filteredData);
        headers = selectedLanguage === 'en'
          ? ['Name', 'Artist', 'Album', 'Minutes Played']
          : ['Adı', 'Sanatçı', 'Albüm', 'Oynatma Süresi (Dakika)'];
        break;
      case 'album':
        filteredStats = calculateAlbumStats(filteredData);
        headers = selectedLanguage === 'en'
          ? ['Name', 'Artist', 'Minutes Played']
          : ['Adı', 'Sanatçı', 'Oynatma Süresi (Dakika)'];
        break;
      case 'artist':
        filteredStats = calculateArtistStats(filteredData);
        headers = selectedLanguage === 'en' ? ['Name', 'Minutes Played'] : ['Adı', 'Oynatma Süresi (Dakika)'];
        break;
      case 'podcast':
        filteredStats = calculatePodcastStatsByEpisode(filteredData);
        headers = selectedLanguage === 'en'
          ? ['Show Name', 'Minutes Played']
          : ['Gösteri Adı', 'Oynatma Süresi (Dakika)'];
        break;
    }
    populateTable(
      detailedStats,
      getTopItems(filteredStats, 10, dataType === 'podcast' ? ['showName'] : ['artistName', 'albumName']),
      headers
    );
  }

  function populateTable(table, items, headers) {
    const translatedHeaders = headers.map((header) => {
      switch (header) {
        case 'Name':
          return selectedLanguage === 'en' ? 'Name' : 'Adı';
        case 'Artist':
          return selectedLanguage === 'en' ? 'Artist' : 'Sanatçı';
        case 'Album':
          return selectedLanguage === 'en' ? 'Album' : 'Albüm';
        case 'Minutes Played':
          return selectedLanguage === 'en' ? 'Minutes Played' : 'Oynatma Süresi (Dakika)';
        case 'Show Name':
          return selectedLanguage === 'en' ? 'Show Name' : 'Gösteri Adı';
        default:
          return header;
      }
    });
    table.innerHTML = `<tr>${translatedHeaders.map((header) => `<th>${header}</th>`).join('')}</tr>`;
    items.forEach((item) => {
      const row = document.createElement('tr');
      const { name, artistName, albumName, showName, totalMsPlayed } = item;
      row.innerHTML = `
        <td>${name}</td>
        ${artistName ? `<td>${artistName}</td>` : ''}
        ${albumName ? `<td>${albumName}</td>` : ''}
        ${showName ? `<td>${showName}</td>` : ''}
        <td>${Math.floor(totalMsPlayed / 60000)}</td>
      `;
      table.appendChild(row);
    });
  }

  function findFirstPlayedRecord(data) {
    return data.reduce((min, obj) => (obj.ts < min.ts ? obj : min), data[0]);
  }

  function findLastPlayedRecord(data) {
    return data.reduce((max, obj) => (obj.ts > max.ts ? obj : max), data[0]);
  }

  function calculateDurationBetweenTimestamps(ts1, ts2, language = 'en') {
    const t1 = new Date(ts1);
    const t2 = new Date(ts2);
    const duration = t2 - t1;
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    if (language === 'tr') {
      return `${days} gün, ${hours} saat, ${minutes} dakika, ${seconds} saniye`;
    }
    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
  }

  function formatTimestamp(ts, language) {
    const date = new Date(ts);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    };
    if (language === 'en') {
      return date.toLocaleString('en-US', options);
    } else {
      return date.toLocaleString('tr-TR', options);
    }
  }

  function calculateTotalPlayTime(data) {
    const totalMsPlayed = data.reduce((sum, obj) => sum + obj.ms_played, 0);
    return Math.floor(totalMsPlayed / (1000 * 60));
  }

  function calculateTrackStats(data) {
    const trackStats = {};
    data.forEach((obj) => {
      if (
        obj.master_metadata_track_name &&
        obj.master_metadata_album_artist_name &&
        obj.master_metadata_album_album_name
      ) {
        const key = obj.master_metadata_track_name;
        if (!trackStats[key]) {
          trackStats[key] = {
            occurrences: 0,
            totalMsPlayed: 0,
            artistName: obj.master_metadata_album_artist_name,
            albumName: obj.master_metadata_album_album_name,
          };
        }
        trackStats[key].occurrences++;
        trackStats[key].totalMsPlayed += obj.ms_played;
      }
    });
    return trackStats;
  }

  function calculateAlbumStats(data) {
    const albumStats = {};
    data.forEach((obj) => {
      if (obj.master_metadata_album_album_name && obj.master_metadata_album_artist_name) {
        const key = obj.master_metadata_album_album_name;
        if (!albumStats[key]) {
          albumStats[key] = {
            occurrences: 0,
            totalMsPlayed: 0,
            artistName: obj.master_metadata_album_artist_name,
          };
        }
        albumStats[key].occurrences++;
        albumStats[key].totalMsPlayed += obj.ms_played;
      }
    });
    return albumStats;
  }

  function calculateArtistStats(data) {
    const artistStats = {};
    data.forEach((obj) => {
      if (obj.master_metadata_album_artist_name) {
        const key = obj.master_metadata_album_artist_name;
        if (!artistStats[key]) {
          artistStats[key] = { occurrences: 0, totalMsPlayed: 0 };
        }
        artistStats[key].occurrences++;
        artistStats[key].totalMsPlayed += obj.ms_played;
      }
    });
    return artistStats;
  }

  function calculatePodcastStatsByEpisode(data) {
    const podcastStats = {};
    data.forEach((obj) => {
      if (obj.episode_name && obj.episode_show_name) {
        const key = obj.episode_show_name;
        if (!podcastStats[key]) {
          podcastStats[key] = { occurrences: 0, totalMsPlayed: 0 };
        }
        podcastStats[key].occurrences++;
        podcastStats[key].totalMsPlayed += obj.ms_played;
      }
    });
    return podcastStats;
  }

  function getTopItems(stats, topN, additionalFields = []) {
    const items = Object.keys(stats).map((key) => ({
      name: key,
      ...stats[key],
    }));
    items.sort((a, b) => b.totalMsPlayed - a.totalMsPlayed);
    return items.slice(0, topN).map((item) => {
      const result = { name: item.name, totalMsPlayed: item.totalMsPlayed };
      additionalFields.forEach((field) => {
        result[field] = item[field];
      });
      return result;
    });
  }

  function filterData(data, dataType, timePeriod, month, year) {
    let filteredData = data;
    if (dataType !== 'all') {
      filteredData = filteredData.filter((obj) => {
        switch (dataType) {
          case 'track':
            return obj.master_metadata_track_name;
          case 'album':
            return obj.master_metadata_album_album_name;
          case 'artist':
            return obj.master_metadata_album_artist_name;
          case 'podcast':
            return obj.episode_name;
        }
      });
    }
    if (timePeriod !== 'all') {
      const timeRanges = {
        morning: [6, 12],
        afternoon: [12, 18],
        evening: [18, 24],
        night: [0, 6],
      };
      const [startHour, endHour] = timeRanges[timePeriod];
      filteredData = filteredData.filter((obj) => {
        const hour = new Date(obj.ts).getHours();
        return hour >= startHour && hour < endHour;
      });
    }
    if (month !== 'all') {
      filteredData = filteredData.filter((obj) => new Date(obj.ts).getMonth() + 1 === parseInt(month));
    }
    if (year !== 'all') {
      filteredData = filteredData.filter((obj) => new Date(obj.ts).getFullYear() === parseInt(year));
    }
    return filteredData;
  }

  function findMostListenedDay(data) {
    const dayStats = {};
    let lang;
    if (selectedLanguage === 'tr') {
      lang = 'tr-TR';
    } else {
      lang = 'en-US';
    }
    data.forEach((obj) => {
      const date = new Date(obj.ts).toLocaleDateString(lang, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      if (!dayStats[date]) {
        dayStats[date] = 0;
      }
      dayStats[date] += obj.ms_played;
    });
    const mostListenedDay = Object.keys(dayStats).reduce((a, b) => (dayStats[a] > dayStats[b] ? a : b));
    return { date: mostListenedDay, minutes: Math.floor(dayStats[mostListenedDay] / 60000) };
  }

  window.toggleDetails = function (sectionId) {
    const section = document.getElementById(sectionId);
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  };

  window.exportData = function () {
    const data = {
      tracks: Array.from(trackStats.querySelectorAll('tr'))
        .slice(1)
        .map((tr) => tr.innerText),
      albums: Array.from(albumStats.querySelectorAll('tr'))
        .slice(1)
        .map((tr) => tr.innerText),
      artists: Array.from(artistStats.querySelectorAll('tr'))
        .slice(1)
        .map((tr) => tr.innerText),
      podcasts: Array.from(podcastStats.querySelectorAll('tr'))
        .slice(1)
        .map((tr) => tr.innerText),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spotify_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  window.showTab = function (tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tabContent => {
      tabContent.style.display = 'none';
    });

    // Remove 'active' class from all tab buttons
    document.querySelectorAll('.btn-dark').forEach(button => {
      button.classList.remove('active');
    });

    // Show the selected tab content
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
      tabContent.style.display = 'block';
    }

    // Add 'active' class to the clicked tab button
    const tabButton = document.querySelector(`[onclick*="${tabId}"]`);
    if (tabButton) {
      tabButton.closest('.btn-dark').classList.add('active');
    }
  };

  function switchLanguage(language) {
    const previousLanguage = selectedLanguage;
    selectedLanguage = language;
    const translations = {
      en: {
      title: 'Spotify Lifetime Wrapped',
      welcomeTitle: 'Welcome to Spotify Lifetime Wrapped',
      welcomeDescription1:
        'Hi 🙋🏻‍♂️ I\'m Talha. With this app, you\'ll be able to access extensive analytics on the music and podcast data you\'ve been listening to since the day you opened your Spotify account. All you need to do is request this data from Spotify and upload the zip file or the json extension files in the zip here.',
      welcomeDescription2:
        'For any questions or suggestions, you can reach me at <a href="mailto:onevzattalha@gmail.com" style="color: #1db954;">onevzattalha@gmail.com</a>. Hope you enjoy the app!',
      welcomeDescription3: 'If you don\'t know how to get your Spotify data, you can follow the instructions here.',
      uploadTitle: 'Upload Your Files',
      chooseFiles: 'Choose Files',
      analyzeButton: 'Analyze Data',
      loadingMessage: 'Analyzing data, please wait...',
      resultsTitle: 'Analysis Results',
      tracksTab: 'Tracks',
      albumsTab: 'Albums',
      artistsTab: 'Artists',
      podcastsTab: 'Podcasts',
      detailedTab: 'Detailed Data',
      filterDataTitle: 'Filter Data',
      dataTypeLabel: 'Data Type:',
      trackOption: 'Track',
      albumOption: 'Album',
      artistOption: 'Artist',
      podcastOption: 'Podcast',
      timePeriodLabel: 'Time of Day:',
      allOption: 'All',
      morningOption: 'Morning (6 AM - 12 PM)',
      afternoonOption: 'Afternoon (12 PM - 6 PM)',
      eveningOption: 'Evening (6 PM - 12 AM)',
      nightOption: 'Night (12 AM - 6 AM)',
      monthLabel: 'Month:',
      januaryOption: 'January',
      februaryOption: 'February',
      marchOption: 'March',
      aprilOption: 'April',
      mayOption: 'May',
      juneOption: 'June',
      julyOption: 'July',
      augustOption: 'August',
      septemberOption: 'September',
      octoberOption: 'October',
      novemberOption: 'November',
      decemberOption: 'December',
      yearLabel: 'Year:',
      filterButton: 'Filter Data',
      exportTxt: 'Export as TXT',
      exportPdf: 'Export as PDF',
      exportCsv: 'Export as CSV',
      learnMore: 'Learn more about your Spotify data',
      noDataMessage: 'No data for the selected filters.',
      firstRecord: 'First record date and time: ',
      lastRecord: 'Last record date and time: ',
      totalRecords: 'Total records: ',
      accountUsageDuration: 'Account usage duration: ',
      totalPlayTime: 'Total play time: ',
      noFileSelected: 'No file selected',
      summaryTitle: 'Summary',
      dataTabsTitle: 'Data Tabs',
      privacyMessage: 'This is an only client-side application, which means your data is not stored anywhere. When you refresh the page or close the browser, it will be gone.',
      instructionsTitle: 'How to Request Your Spotify Data',
      step1: 'Click on the link <a href="https://www.spotify.com/tr-tr/account/privacy/" target="_blank">https://www.spotify.com/tr-tr/account/privacy/</a> to go to the privacy page of Spotify',
      step2: 'Log in to your account if you\'re not logged in',
      step3: 'Scroll down to the "Download your data" section.',
      step4: 'Make sure only the checkbox for "Extended streaming history" checked and Click on the "Request data".',
      step5: 'Wait for an email from Spotify with a link to download your data.',
      step6: 'Download the zip file from the link provided in the email.',
      visualizationTitle: 'Visualizations',
      selectInterval: 'Select Interval:',
      monthlyOption: 'Monthly',
      yearlyOption: 'Yearly',
      backToMonthly: 'Back to Monthly Data',
      shareTitle: 'Share Your Top Tracks',
      shareX: 'Share on X',
      downloadImage: 'Download Image',
      shareTooltip: 'This will download the image for you to add into your X post',
      aiComment: "Get AI Commentary",
      aiCommentTitle: "AI Commentary",
      aiLoading: "Thinking of something funny to say...",
      searchTitle: 'Search',
      searchTypeLabel: 'Search Type:',
      searchPlaceholder: 'Start typing to search...',
      noResults: 'No results found',
      firstListenedOn: 'First listened on:',
      lastListenedOn: 'Last listened on:',
      totalListeningTime: 'Total listening time:',
      searchResults: 'Search Results',
      minutes: 'minutes',
      listeningCount: 'Number of times listened:'
      },
      tr: {
      title: 'Spotify Lifetime Wrapped',
      welcomeTitle: "Spotify Lifetime Wrapped'a Hoş Geldiniz",
      welcomeDescription1:
        'Selam 🙋🏻‍♂️ Ben Talha. Bu uygulama sayesinde Spotify hesabını açtığın günden beri dinlemiş olduğun müzik ve podcast verilerine dair geniş analizlere ulaşabileceksin. Tek yapman gereken Spotify’dan bu verileri talep etmek ve gelen zip dosyasını veya zip içerisindeki json uzantılı dosyaları buraya yüklemek.',
      welcomeDescription2:
        'Herhangi bir soru veya öneri için bana <a href="mailto:onevzattalha@gmail.com" style="color: #1db954;">onevzattalha@gmail.com</a> hesabından ulaşabilirsin.',
      uploadTitle: 'Dosyalarınızı Yükleyin',
      chooseFiles: 'Dosyaları Seçin',
      analyzeButton: 'Verileri Analiz Et',
      loadingMessage: 'Veriler analiz ediliyor, lütfen bekleyin...',
      resultsTitle: 'Analiz Sonuçları',
      tracksTab: 'Şarkılar',
      albumsTab: 'Albümler',
      artistsTab: 'Sanatçılar',
      podcastsTab: 'Podcastler',
      detailedTab: 'Detaylı Veri',
      filterDataTitle: 'Verileri Filtrele',
      dataTypeLabel: 'Veri Türü:',
      trackOption: 'Şarkı',
      albumOption: 'Albüm',
      artistOption: 'Sanatçı',
      podcastOption: 'Podcast',
      timePeriodLabel: 'Günün Saati:',
      allOption: 'Hepsi',
      morningOption: 'Sabah (6 AM - 12 PM)',
      afternoonOption: 'Öğleden Sonra (12 PM - 6 PM)',
      eveningOption: 'Akşam (6 PM - 12 AM)',
      nightOption: 'Gece (12 AM - 6 AM)',
      monthLabel: 'Ay:',
      januaryOption: 'Ocak',
      februaryOption: 'Şubat',
      marchOption: 'Mart',
      aprilOption: 'Nisan',
      mayOption: 'Mayıs',
      juneOption: 'Haziran',
      julyOption: 'Temmuz',
      augustOption: 'Ağustos',
      septemberOption: 'Eylül',
      octoberOption: 'Ekim',
      novemberOption: 'Kasım',
      decemberOption: 'Aralık',
      yearLabel: 'Yıl:',
      filterButton: 'Verileri Filtrele',
      exportTxt: 'TXT Olarak Dışa Aktar',
      exportPdf: 'PDF Olarak Dışa Aktar',
      exportCsv: 'CSV Olarak Dışa Aktar',
      learnMore: 'Spotify verileriniz hakkında daha fazla bilgi edinin',
      noDataMessage: 'Seçilen filtreler için veri yok.',
      noFileSelected: 'Dosya seçilmedi',
      summaryTitle: 'Özet',
      dataTabsTitle: 'Veri Sekmeleri',
      privacyMessage: 'Bu, yalnızca istemci tarafında çalışan bir uygulamadır, yani verileriniz hiçbir yerde saklanmaz. Sayfayı yenilediğinizde veya tarayıcıyı kapattığınızda veriler silinir.',
      welcomeDescription3: 'Spotify verilerinizi nasıl alacağınızı bilmiyorsanız, buradaki talimatları izleyebilirsiniz.',
      instructionsTitle: 'Spotify Verilerinizi Nasıl Talep Edebilirsiniz',
      step1: 'Spotify gizlilik sayfasına gitmek için <a href="https://www.spotify.com/tr-tr/account/privacy/" target="_blank">https://www.spotify.com/tr-tr/account/privacy/</a> bağlantısına tıklayın',
      step2: 'Giriş yapmadıysanız hesabınıza giriş yapın',
      step3: '"Verilerinizi indirin" bölümüne kadar aşağı kaydırın.',
      step4: 'Yalnızca "Ayrıntılı çevrimiçi dinleme geçmişi" kutucuğunu işaretlendiğinden emin olun ve ardından "Veri talebinde bulun" düğmesine tıklayın.',
      step5: 'Spotify\'dan verilerinizi indirmeniz için bir bağlantı içeren bir e-posta bekleyin. (Veri gönderme süresi 30 gün olarak belirtilse de birkaç gün içerisinde gönderilicektir)',
      step6: 'E-postada sağlanan bağlantıdan zip dosyasını indirin.',
      visualizationTitle: 'Görselleştirmeler',
      selectInterval: 'Aralığı Seçin:',
      monthlyOption: 'Aylık',
      yearlyOption: 'Yıllık',
      backToMonthly: 'Aylık Verilere Geri Dön',
      shareTitle: 'En Çok Dinlediğin Şarkıları Paylaş',
      shareX: 'X\'te Paylaş',
      downloadImage: 'Görsel İndir',
      shareTooltip: 'Görseli X gönderinize ekleyebilmeniz için indirilecektir',
      aiComment: "Yapay Zeka Yorumu Al",
      aiCommentTitle: "Yapay Zeka Yorumu",
      aiLoading: "Eğlenceli bir şeyler düşünüyorum...",
      searchTitle: 'Ara',
      searchTypeLabel: 'Arama Türü:',
      searchPlaceholder: 'Aramak için yazmaya başlayın...',
      noResults: 'Sonuç bulunamadı',
      firstListenedOn: 'İlk dinleme:',
      lastListenedOn: 'Son dinleme:',
      totalListeningTime: 'Toplam dinleme süresi:',
      searchResults: 'Arama Sonuçları',
      minutes: 'dakika',
      listeningCount: 'Dinlenme sayısı:'
      }
    };

    const content = translations[language];
    document.querySelectorAll('[data-translate]').forEach((element) => {
      const key = element.getAttribute('data-translate');
      element.innerHTML = content[key];
    });

    // Update the content of the welcomeDescription3 paragraph
    const welcomeDescription3 = document.querySelector('[data-translate="welcomeDescription3"]');
    if (welcomeDescription3) {
      if (language === 'en') {
        welcomeDescription3.innerHTML = `If you don't know how to get your Spotify data, you can follow the instructions <span id="open-modal" style="color: #1db954; cursor: pointer;">here</span>.`;
      } else {
        welcomeDescription3.innerHTML = `Spotify verilerinizi nasıl alacağınızı bilmiyorsanız, <span id="open-modal" style="color: #1db954; cursor: pointer;">buradaki</span> talimatları izleyebilirsiniz.`;
      }

      // Re-attach the event listener to the new span
      const modalTrigger = document.getElementById('open-modal');
      if (modalTrigger) {
        modalTrigger.onclick = function() {
          modal.style.display = "block";
          const modalContent = document.getElementById('modal-content');
          if (modalContent) {
            modalContent.innerHTML = selectedLanguage === 'en' ? translations.en.instructions : translations.tr.instructions;
          }
        };
      }
    }

    // Update the file chosen text if no file is selected
    if (fileUpload.files.length === 0) {
      fileChosen.textContent = content.noFileSelected;
    }

    if (data.length > 0) {
      displaySummary(data, language);
      displayFilteredStats(data, dataTypeSelect.value);
      // Force recreation of charts when language changes
      displayCharts(data, true);
    } else {
      updateChartLabels(language);
    }

    updateTooltips(language);
    updateDropdownOptions();
  }

  // Get the modal
  var modal = document.getElementById("instructions-modal");

  // Get the button that opens the modal
  var btn = document.getElementById("open-modal");

  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];

  // When the user clicks the button, open the modal 
  if (btn) {
    btn.onclick = function() {
      modal.style.display = "block";
      const modalContent = document.getElementById('modal-content');
      if (modalContent) {
        modalContent.innerHTML = selectedLanguage === 'en' ? translations.en.instructions : translations.tr.instructions;
      }
    }
  }

  // When the user clicks on <span> (x), close the modal
  if (span) {
    span.onclick = function() {
      modal.style.display = "none";
    }
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }

  const monthTranslations = {
    en: {
      January: 'January',
      February: 'February',
      March: 'March',
      April: 'April',
      May: 'May',
      June: 'June',
      July: 'July',
      August: 'August',
      September: 'September',
      October: 'October',
      November: 'November',
      December: 'December'
    },
    tr: {
      January: 'Ocak',
      February: 'Şubat',
      March: 'Mart',
      April: 'Nisan',
      May: 'Mayıs',
      June: 'Haziran',
      July: 'Temmuz',
      August: 'Ağustos',
      September: 'Eylül',
      October: 'Ekim',
      November: 'Kasım',
      December: 'Aralık'
    }
  };

  function calculateDailyData(data) {
    const cache = {};
    data.forEach(item => {
      const date = new Date(item.ts);
      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const key = `${year}-${month}`;
      
      if (!cache[key]) {
        cache[key] = {};
      }
      
      const day = date.getDate();
      if (!cache[key][day]) {
        cache[key][day] = 0;
      }
      
      cache[key][day] += item.ms_played / 60000;
    });

    return cache;
  }

  function displayCharts(data, forceRecreate = false) {
    try {
      // Pre-calculate daily and monthly data
      dailyDataCache = calculateDailyData(data);
      monthlyDataCache = groupDataByInterval(data, 'monthly');
      
      // Calculate stats
      const trackStatsData = calculateTrackStats(data);
      const albumStatsData = calculateAlbumStats(data);
      const artistStatsData = calculateArtistStats(data);
      const podcastStatsData = calculatePodcastStatsByEpisode(data);

      // Prepare data for charts
      const trackLabels = getTopItems(trackStatsData, 5).map(item => item.name);
      const trackData = getTopItems(trackStatsData, 5).map(item => item.totalMsPlayed / 60000);

      const albumLabels = getTopItems(albumStatsData, 5).map(item => item.name);
      const albumData = getTopItems(albumStatsData, 5).map(item => item.totalMsPlayed / 60000);

      const artistLabels = getTopItems(artistStatsData, 5).map(item => item.name);
      const artistData = getTopItems(artistStatsData, 5).map(item => item.totalMsPlayed / 60000);

      const podcastLabels = getTopItems(podcastStatsData, 5).map(item => item.name);
      const podcastData = getTopItems(podcastStatsData, 5).map(item => item.totalMsPlayed / 60000);

      // Set chart titles based on current language
      const chartTitles = {
        tracks: selectedLanguage === 'en' ? 'Top Tracks' : 'En Çok Dinlenen Şarkılar',
        albums: selectedLanguage === 'en' ? 'Top Albums' : 'En Çok Dinlenen Albümler',
        artists: selectedLanguage === 'en' ? 'Top Artists' : 'En Çok Dinlenen Sanatçılar',
        podcasts: selectedLanguage === 'en' ? 'Top Podcasts' : 'En Çok Dinlenen Podcastler',
        timeline: selectedLanguage === 'en' ? 'Track Plays Over Time' : 'Zaman İçinde Dinleme Aktivitesi'
      };

      // Always destroy existing charts when forceRecreate is true
      if (forceRecreate && window.charts) {
        if (window.charts.trackChart) {
          window.charts.trackChart.destroy();
        }
        if (window.charts.albumChart) {
          window.charts.albumChart.destroy();
        }
        if (window.charts.artistChart) {
          window.charts.artistChart.destroy();
        }
        if (window.charts.podcastChart) {
          window.charts.podcastChart.destroy();
        }
        if (window.charts.lineChart) {
          window.charts.lineChart.destroy();
        }
        // Reset the charts object completely
        window.charts = {};
      }

      // Initialize charts object if it doesn't exist
      if (!window.charts) {
        window.charts = {};
      }

      // Create or update charts
      if (document.getElementById('trackChart')) {
        if (forceRecreate || !window.charts.trackChart) {
          window.charts.trackChart = createPieChart('trackChart', chartTitles.tracks, trackLabels, trackData);
        }
      }
      
      if (document.getElementById('albumChart')) {
        if (forceRecreate || !window.charts.albumChart) {
          window.charts.albumChart = createPieChart('albumChart', chartTitles.albums, albumLabels, albumData);
        }
      }
      
      if (document.getElementById('artistChart')) {
        if (forceRecreate || !window.charts.artistChart) {
          window.charts.artistChart = createPieChart('artistChart', chartTitles.artists, artistLabels, artistData);
        }
      }
      
      if (document.getElementById('podcastChart')) {
        if (forceRecreate || !window.charts.podcastChart) {
          window.charts.podcastChart = createPieChart('podcastChart', chartTitles.podcasts, podcastLabels, podcastData);
        }
      }
      
      if (document.getElementById('trackLineChart')) {
        if (forceRecreate || !window.charts.lineChart) {
          window.charts.lineChart = createLineChart('trackLineChart', chartTitles.timeline, data, 'monthly');
        }
      }

      // Show visualization section
      document.getElementById('visualization-section').style.display = 'block';
      
      // Set up back button
      const backButton = document.getElementById('back-to-monthly');
      if (backButton) {
        backButton.textContent = selectedLanguage === 'en' ? 'Back to Monthly Data' : 'Aylık Verilere Geri Dön';
        backButton.onclick = () => {
          if (window.charts && window.charts.lineChart) {
            updateLineChartWithMonthlyData(window.charts.lineChart, data);
            backButton.style.display = 'none';
          }
        };
      }
    } catch (error) {
      console.error('Error displaying charts:', error);
    }
  }

  // Update createPieChart to remove logging
  function createPieChart(canvasId, title, labels, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Clean up any existing chart on this canvas
    const existingChart = Chart.getChart(canvasId);
    if (existingChart) {
      existingChart.destroy();
    }
    
    // Create a new chart with the current language title
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#FF6384',
            '#36A2EB', 
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ],
          borderColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#FFFFFF'
            }
          },
          title: {
            display: true,
            text: title,
            color: '#FFFFFF',
            font: {
              size: 20
            }
          }
        }
      }
    });
    
    return chart;
  }

  function createLineChart(canvasId, title, data, interval) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
        
    // Clean up existing chart
    const existingChart = Chart.getChart(canvasId);
    if (existingChart) {
      existingChart.destroy();
    }

    // First, set a fixed height for the canvas container
    const container = ctx.parentElement;
    if (container) {
        container.style.height = '400px'; // Fixed height
        container.style.position = 'relative';
    }

    // Reset canvas dimensions
    ctx.style.height = '100%';
    ctx.style.width = '100%';

    // Destroy existing chart if it exists
    if (window.charts && window.charts[canvasId]) {
        window.charts[canvasId].destroy();
    }

    const groupedData = groupDataByInterval(data, interval);
    const labels = Object.keys(groupedData);
    const plays = Object.values(groupedData);

    // Create the chart instance and store it in a variable
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedLanguage === 'en' ? 'Minutes Played' : 'Dinlenme Süresi (Dakika)',
                data: plays,
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // This is important
            height: 400, // Fixed height
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#FFFFFF',
                        font: {
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: title,
                    color: '#FFFFFF',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const minutesText = selectedLanguage === 'en' ? 'minutes' : 'dakika';
                            return `${Math.round(context.raw)} ${minutesText}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#FFFFFF',
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#FFFFFF',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return Math.round(value);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            },
            onClick: (event, elements) => {
                if (elements.length > 0 && interval === 'monthly') {
                    const index = elements[0].index;
                    const selectedLabel = labels[index];
                    const [year, month] = selectedLabel.split('-');
                    updateLineChartWithDailyData(chart, data, year, month);
                }
            }
        }
    });

    return chart;
}

function updateLineChartWithDailyData(chart, data, year, month) {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `<div>${selectedLanguage === 'en' ? 'Loading daily data...' : 'Günlük veriler yükleniyor...'}</div>`;
    chart.canvas.parentNode.style.position = 'relative';
    chart.canvas.parentNode.appendChild(loadingOverlay);

    requestAnimationFrame(() => {
        // Convert translated month name back to English for cache lookup
        const englishMonth = getEnglishMonthName(month);
        const cacheKey = `${year}-${englishMonth}`;
        const dailyData = dailyDataCache[cacheKey] || {};
        
        const sortedDays = Object.keys(dailyData)
            .map(Number)
            .sort((a, b) => a - b)
            .map(day => day.toString().padStart(2, '0'));

        const labels = sortedDays.map(day => 
            selectedLanguage === 'en' 
                ? `${month} ${day}` 
                : `${monthTranslations.tr[month] || month} ${day}`
        );
        
        const plays = sortedDays.map(day => dailyData[parseInt(day)] || 0);

        if (labels.length > 0 && plays.length > 0) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = plays;
            
            chart.options.plugins.title.text = selectedLanguage === 'en' 
                ? `Daily Data for ${month} ${year}` 
                : `${monthTranslations.tr[month] || month} ${year} Günlük Veriler`;
            
            // Update scales for daily view
            chart.options.scales.x.ticks = {
                ...chart.options.scales.x.ticks,
                maxRotation: 45,
                minRotation: 45,
                font: {
                    size: 11
                }
            };

            // Temporarily remove click handler
            const originalOnClick = chart.options.onClick;
            chart.options.onClick = null;

            chart.update('default');

            // Show back button
            const backButton = document.getElementById('back-to-monthly');
            if (backButton) {
                backButton.style.display = 'block';
                backButton.onclick = () => {
                    updateLineChartWithMonthlyData(chart, data);
                    chart.options.onClick = originalOnClick;
                    backButton.style.display = 'none';
                };
            }
        } else {
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.options.plugins.title.text = selectedLanguage === 'en'
                ? `No daily data available for ${month} ${year}`
                : `${monthTranslations.tr[month] || month} ${year} için günlük veri yok`;
            chart.update('none');
        }

        loadingOverlay.remove();
    });
}

// Add this helper function to convert month names back to English
function getEnglishMonthName(monthName) {
    // First check if it's already English
    if (Object.keys(monthTranslations.en).includes(monthName)) {
        return monthName;
    }
    
    // If it's in another language, translate it back to English
    for (const [enMonth, trMonth] of Object.entries(monthTranslations.tr)) {
        if (trMonth === monthName) {
            return enMonth;
        }
    }
    
    // If not found, return the original
    return monthName;
}

  function groupDataByInterval(data, interval) {
    const groupedData = {};
    data.forEach(item => {
      const date = new Date(item.ts);
      let key;
      if (interval === 'monthly') {
        const month = date.toLocaleString('en-US', { month: 'long' });
        const translatedMonth = monthTranslations[selectedLanguage][month] || month;
        key = `${date.getFullYear()}-${translatedMonth}`;
      } else if (interval === 'yearly') {
        key = `${date.getFullYear()}`;
      }
      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      groupedData[key] += item.ms_played / 60000;
    });
    return groupedData;
  }

  function updateLineChartWithMonthlyData(chart, data) {
    // Show loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.innerHTML = `<div>${selectedLanguage === 'en' ? 'Loading monthly data...' : 'Aylık veriler yükleniyor...'}</div>`;
    chart.canvas.parentNode.style.position = 'relative';
    chart.canvas.parentNode.appendChild(loadingOverlay);

    // Use requestAnimationFrame for smoother UI update
    requestAnimationFrame(() => {
      // Use cached monthly data instead of recalculating
      const labels = Object.keys(monthlyDataCache);
      const plays = Object.values(monthlyDataCache);

      // Update chart data
      chart.data.labels = labels;
      chart.data.datasets[0].data = plays;
      chart.options.plugins.title.text = selectedLanguage === 'en' 
        ? 'Track Plays Over Time' 
        : 'Zaman İçinde Dinleme Aktivitesi';

      // Update legend labels
      chart.options.plugins.legend.labels = {
        color: '#FFFFFF',
        generateLabels: function(chart) {
          return [{
            text: selectedLanguage === 'en' ? 'Minutes Played' : 'Dinlenme Süresi (Dakika)',
            fillStyle: '#36A2EB',
            strokeStyle: '#36A2EB',
            lineWidth: 1,
            hidden: false
          }];
        }
      };

      // Restore click handler for monthly view
      chart.options.onClick = (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const selectedLabel = labels[index];
          const [year, month] = selectedLabel.split('-');
          updateLineChartWithDailyData(chart, data, year, month);
          document.getElementById('back-to-monthly').style.display = 'block';
        }
      };

      // Use 'none' for instant update, then remove loading overlay
      chart.update('none');
      loadingOverlay.remove();
    });
  }

  function getTopTracksForDay(data, year, month, day) {
    const dayData = data.filter(item => {
      const date = new Date(item.ts);
      return date.getFullYear() === parseInt(year) && date.toLocaleString('default', { month: 'long' }) === month && date.getDate() === parseInt(day);
    });

    const trackStats = calculateTrackStats(dayData);
    const topTracks = getTopItems(trackStats, 5).map(track => ({
      name: track.name,
      minutesPlayed: Math.floor(track.totalMsPlayed / 60000)
    }));

    return topTracks;
  }

  document.getElementById('line-chart-interval').addEventListener('change', (event) => {
    if (window.charts && window.charts.lineChart) {
      const interval = event.target.value;
      window.charts.lineChart = createLineChart('trackLineChart', 
        selectedLanguage === 'en' ? 'Track Plays Over Time' : 'Zaman İçinde Dinleme Aktivitesi', 
        data, 
        interval
      );
      document.getElementById('back-to-monthly').style.display = 'none';
    }
  });

  function generateShareImage() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const table = document.getElementById('track-stats');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 850; // Increased height for additional stats

    // Background
    context.fillStyle = '#212529';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Main Title
    context.fillStyle = '#1db954'; // Spotify green
    context.font = 'bold 28px Arial';
    const mainTitle = 'Spotify Lifetime Wrapped';
    const mainTitleWidth = context.measureText(mainTitle).width;
    context.fillText(mainTitle, (canvas.width - mainTitleWidth) / 2, 40);

    // Date Range
    const firstRecord = findFirstPlayedRecord(data);
    const lastRecord = findLastPlayedRecord(data);
    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    const dateRange = selectedLanguage === 'en'
      ? `Data range: ${formatTimestamp(firstRecord.ts, 'en')} - ${formatTimestamp(lastRecord.ts, 'en')}`
      : `Veri aralığı: ${formatTimestamp(firstRecord.ts, 'tr')} - ${formatTimestamp(lastRecord.ts, 'tr')}`;
    const dateRangeWidth = context.measureText(dateRange).width;
    context.fillText(dateRange, (canvas.width - dateRangeWidth) / 2, 70);

    // Account Stats
    const accountUsageDuration = calculateDurationBetweenTimestamps(firstRecord.ts, lastRecord.ts, selectedLanguage);
    const totalPlayTime = calculateTotalPlayTime(data);
    const mostListenedDay = findMostListenedDay(data);
    
    context.fillStyle = '#1db954';
    context.font = 'bold 20px Arial';
    const statsTitle = selectedLanguage === 'en' ? 'Account Statistics' : 'Hesap İstatistikleri';
    context.fillText(statsTitle, 40, 110);

    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    const statsText = selectedLanguage === 'en' 
      ? [
          `Account usage duration: ${accountUsageDuration}`,
          `Total play time: ${totalPlayTime} minutes`,
          `Most listened day: ${mostListenedDay.date} (${mostListenedDay.minutes} minutes)`
        ]
      : [
          `Hesap kullanım süresi: ${accountUsageDuration}`,
          `Toplam dinleme süresi: ${totalPlayTime} dakika`,
          `En çok dinlenen gün: ${mostListenedDay.date} (${mostListenedDay.minutes} dakika)`
        ];

    statsText.forEach((text, index) => {
      context.fillText(text, 40, 140 + (index * 25));
    });

    // Tracks Title
    context.fillStyle = '#1db954';
    context.font = 'bold 24px Arial';
    const title = selectedLanguage === 'en' ? 'My Top 10 Tracks' : 'En Çok Dinlediğim 10 Şarkı';
    context.fillText(title, 40, 230);

    // Table content
    context.fillStyle = '#ffffff';
    context.font = '16px Arial';
    let y = 270; // Adjusted starting position
    const rows = Array.from(table.querySelectorAll('tr'));
    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      const cells = Array.from(row.querySelectorAll('td'));
      const trackName = cells[0].textContent;
      const artist = cells[1].textContent;
      const minutes = cells[3].textContent;
      context.fillText(`${index}. ${trackName} - ${artist} (${minutes} ${selectedLanguage === 'en' ? 'minutes' : 'dakika'})`, 40, y);
      y += 40;
    });

    // Add watermark
    context.fillStyle = '#666666';
    context.font = '14px Arial';
    context.fillText('spotify-lifetime-wrapped.vercel.app', 40, canvas.height - 20);

    return canvas.toDataURL('image/png');
  }

  window.downloadImage = function() {
    const dataUrl = generateShareImage();
    const link = document.createElement('a');
    link.download = 'spotify-top-tracks.png';
    link.href = dataUrl;
    link.click();
  };

  window.shareToX = function() {
    const dataUrl = generateShareImage();
    const appUrl = 'https://nevzattalhaozcan.github.io/spotify-lifetime-wrapped/';
    
    // Create text with call to action and emoji
    const text = selectedLanguage === 'en' 
      ? '🎵 Here\'s my lifetime Spotify journey! Check out yours at' 
      : '🎵 İşte Spotify yolculuğum! Siz de kendinizinkini görün:';
    
    // Create a shareable tweet with text, app URL, and hash tags
    const hashtags = 'SpotifyLifetimeWrapped,SpotifyStats';
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
      + `&url=${encodeURIComponent(appUrl)}`
      + `&hashtags=${encodeURIComponent(hashtags)}`;

    // Download the image first
    const link = document.createElement('a');
    link.download = 'spotify-stats-for-x.png';
    link.href = dataUrl;
    link.click();

    // Then open X share dialog in a new window
    window.open(shareUrl, '_blank');
  };

  function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Add a new function to update chart labels and titles when language changes
  function updateChartLabels(language) {
    // Update chart titles if charts exist
    if (window.charts) {
      const chartTitles = {
        tracks: language === 'en' ? 'Top Tracks' : 'En Çok Dinlenen Şarkılar',
        albums: language === 'en' ? 'Top Albums' : 'En Çok Dinlenen Albümler',
        artists: language === 'en' ? 'Top Artists' : 'En Çok Dinlenen Sanatçılar',
        podcasts: language === 'en' ? 'Top Podcasts' : 'En Çok Dinlenen Podcastler',
        timeline: language === 'en' ? 'Track Plays Over Time' : 'Zaman İçinde Dinleme Aktivitesi'
      };
      
      // Force update each chart's title and ensure it's reflected in the UI
      if (window.charts.trackChart) {
        window.charts.trackChart.options.plugins.title.text = chartTitles.tracks;
        window.charts.trackChart.update();
      }
      
      if (window.charts.albumChart) {
        window.charts.albumChart.options.plugins.title.text = chartTitles.albums;
        window.charts.albumChart.update();
      }
      
      if (window.charts.artistChart) {
        window.charts.artistChart.options.plugins.title.text = chartTitles.artists;
        window.charts.artistChart.update();
      }
      
      if (window.charts.podcastChart) {
        window.charts.podcastChart.options.plugins.title.text = chartTitles.podcasts;
        window.charts.podcastChart.update();
      }
      
      if (window.charts.lineChart) {
        updateChartTitles(window.charts.lineChart, chartTitles.timeline);
        
        // Update y-axis label
        if (window.charts.lineChart.options && window.charts.lineChart.options.scales && window.charts.lineChart.options.scales.y) {
          window.charts.lineChart.options.scales.y.title = {
            display: true,
            text: language === 'en' ? 'Minutes Played' : 'Dinlenme Süresi (Dakika)'
          };
        }
        
        // Update dataset labels
        if (window.charts.lineChart.data && window.charts.lineChart.data.datasets && window.charts.lineChart.data.datasets.length > 0) {
          window.charts.lineChart.data.datasets[0].label = language === 'en' ? 'Minutes Played' : 'Dinlenme Süresi (Dakika)';
        }
        
        // Update tooltip callback to use translated text
        if (window.charts.lineChart.options && window.charts.lineChart.options.plugins && window.charts.lineChart.options.plugins.tooltip) {
          window.charts.lineChart.options.plugins.tooltip.callbacks = {
            label: function(context) {
              const minutesText = language === 'en' ? 'minutes' : 'dakika';
              return `${Math.round(context.raw)} ${minutesText}`;
            }
          };
        }
        
        window.charts.lineChart.update();
      }
      
      // Update interval selector options directly
      const intervalSelect = document.getElementById('line-chart-interval');
      if (intervalSelect) {
        const options = intervalSelect.options;
        if (options.length >= 2) {
          options[0].text = language === 'en' ? 'Monthly' : 'Aylık';
          options[1].text = language === 'en' ? 'Yearly' : 'Yıllık';
        }
      }
      
      // Update interval selector label
      const intervalLabel = document.querySelector('[data-translate="selectInterval"]');
      if (intervalLabel) {
        intervalLabel.textContent = language === 'en' ? 'Select Interval:' : 'Aralığı Seçin:';
      }
      
      // Update back button text
      const backButton = document.getElementById('back-to-monthly');
      if (backButton) {
        backButton.textContent = language === 'en' ? 'Back to Monthly Data' : 'Aylık Verilere Geri Dön';
      }

      // Update visualization section title
      const visTitle = document.querySelector('[data-translate="visualizationTitle"]');
      if (visTitle) {
        visTitle.textContent = language === 'en' ? 'Visualizations' : 'Görselleştirmeler';
      }

      // Update loading overlay text if present
      const loadingOverlays = document.querySelectorAll('.loading-overlay');
      loadingOverlays.forEach(overlay => {
        overlay.innerHTML = `<div>${language === 'en' ? 'Loading data...' : 'Veriler yükleniyor...'}</div>`;
      });
    }
  }

  // Ensure all dropdown options are translated properly
  function updateDropdownOptions() {
    // Update month names in dropdown
    const monthSelect = document.getElementById('month');
    if (monthSelect) {
      const options = monthSelect.options;
      const monthNames = selectedLanguage === 'en' ? 
        ['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] :
        ['Hepsi', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      
      for (let i = 0; i < options.length; i++) {
        if (i < monthNames.length) {
          options[i].text = monthNames[i];
        }
      }
    }
  }

});
