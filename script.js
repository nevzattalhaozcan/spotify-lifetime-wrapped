document.addEventListener('DOMContentLoaded', () => {
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

  let data = [];
  let selectedLanguage = 'en'; // Default language

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
      fileChosen.textContent =
        files.length === 0 ? noFileSelectedText : files.map((file) => file.name).join(', ');
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
          data = dataArrays.flat();
          displaySummary(data, selectedLanguage);
          displayStats(data);
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          } else {
            console.error('loadingIndicator is null');
          }
          if (resultsSection) {
            resultsSection.style.display = 'block';
          } else {
            console.error('resultsSection is null');
          }
          setTimeout(() => {
            if (document.getElementById('tracks-tab')) {
              showTab('track-section'); // Display the tracks tab by default
            } else {
              console.error('Tab with id tracks-tab not found');
            }
          }, 0); // Ensure the DOM is fully updated before calling showTab
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
      zip
        .loadAsync(file)
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

    const headers =
      selectedLanguage === 'en'
        ? ['Name', 'Artist', 'Album', 'Minutes Played']
        : ['Adı', 'Sanatçı', 'Albüm', 'Oynatma Süresi (Dakika)'];
    populateTable(trackStats, getTopItems(trackStatsData, 10, ['artistName', 'albumName']), headers);
    populateTable(
      albumStats,
      getTopItems(albumStatsData, 10, ['artistName']),
      selectedLanguage === 'en'
        ? ['Name', 'Artist', 'Minutes Played']
        : ['Adı', 'Sanatçı', 'Oynatma Süresi (Dakika)']
    );
    populateTable(
      artistStats,
      getTopItems(artistStatsData, 10),
      selectedLanguage === 'en' ? ['Name', 'Minutes Played'] : ['Adı', 'Oynatma Süresi (Dakika)']
    );
    populateTable(
      podcastStats,
      getTopItems(podcastStatsData, 10, ['showName']),
      selectedLanguage === 'en' ? ['Show Name', 'Minutes Played'] : ['Gösteri Adı', 'Oynatma Süresi (Dakika)']
    );
  }

  function displayFilteredStats(filteredData, dataType) {
    if (filteredData.length === 0) {
      detailedStats.innerHTML =
        selectedLanguage === 'en'
          ? '<tr><td colspan="4">No data for the selected filters.</td></tr>'
          : '<tr><td colspan="4">Seçilen filtreler için veri yok.</td></tr>';
      return;
    }

    let filteredStats;
    let headers;
    switch (dataType) {
      case 'track':
        filteredStats = calculateTrackStats(filteredData);
        headers =
          selectedLanguage === 'en'
            ? ['Name', 'Artist', 'Album', 'Minutes Played']
            : ['Adı', 'Sanatçı', 'Albüm', 'Oynatma Süresi (Dakika)'];
        break;
      case 'album':
        filteredStats = calculateAlbumStats(filteredData);
        headers =
          selectedLanguage === 'en'
            ? ['Name', 'Artist', 'Minutes Played']
            : ['Adı', 'Sanatçı', 'Oynatma Süresi (Dakika)'];
        break;
      case 'artist':
        filteredStats = calculateArtistStats(filteredData);
        headers = selectedLanguage === 'en' ? ['Name', 'Minutes Played'] : ['Adı', 'Oynatma Süresi (Dakika)'];
        break;
      case 'podcast':
        filteredStats = calculatePodcastStatsByEpisode(filteredData);
        headers =
          selectedLanguage === 'en'
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

  window.exportData = function (format) {
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

    if (format === 'txt') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spotify_data.txt';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text('Spotify Data Analysis', 10, 10);
      doc.text(JSON.stringify(data, null, 2), 10, 20);
      doc.save('spotify_data.pdf');
    }
  };

  window.showTab = function (tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tabContent => {
        tabContent.style.display = 'none';
    });

    // Remove 'selected' class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(tabButton => {
        tabButton.classList.remove('selected');
    });

    // Show the selected tab content
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
        tabContent.style.display = 'block';
    } else {
        console.error(`Tab content with id ${tabId} not found`);
    }

    // Add 'selected' class to the clicked tab button
    const tabButton = document.querySelector(`.tab-button[onclick="showTab('${tabId}')"]`);
    if (tabButton) {
        tabButton.classList.add('selected');
    } else {
        console.error(`Tab button with onclick="showTab('${tabId}')" not found`);
    }
  };

  function switchLanguage(language) {
    selectedLanguage = language; // Store the selected language
    const translations = {
      en: {
        title: 'Spotify Lifetime Wrapped',
        welcomeTitle: 'Welcome to Spotify Lifetime Wrapped',
        welcomeDescription1:
          'Discover your lifetime music journey with Spotify Lifetime Wrapped. Upload your Spotify data, analyze it, and explore detailed insights about your listening habits.',
        welcomeDescription2:
          'This tool allows you to upload directly the zip file that Spotify sent you via email or multiple JSON files exported from Spotify, analyze them in one go, and view the results in an organized format. You can also export the analyzed data as TXT or PDF for future reference.',
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
        step4: 'Click on the "Request" button next to "Request your data".',
        step5: 'Wait for an email from Spotify with a link to download your data.',
        step6: 'Download the zip file from the link provided in the email.',
      },
      tr: {
        title: 'Spotify Lifetime Wrapped',
        welcomeTitle: "Spotify Lifetime Wrapped'a Hoş Geldiniz",
        welcomeDescription1:
          'Spotify Lifetime Wrapped ile müzik yolculuğunuzu keşfedin. Spotify verilerinizi yükleyin, analiz edin ve dinleme alışkanlıklarınız hakkında ayrıntılı bilgiler edinin.',
        welcomeDescription2:
          "Bu araç, Spotify'ın size e-posta ile gönderdiği zip dosyasını veya Spotify'dan dışa aktarılan birden fazla JSON dosyasını doğrudan yüklemenize, hepsini aynı anda analiz etmenize ve sonuçları düzenli bir formatta görüntülemenize olanak tanır. Ayrıca analiz edilen verileri gelecekte başvurmak üzere TXT veya PDF olarak dışa aktarabilirsiniz.",
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
        step4: '"Verilerinizi talep edin" düğmesinin yanındaki "Talep et" düğmesine tıklayın.',
        step5: 'Spotify\'dan verilerinizi indirmeniz için bir bağlantı içeren bir e-posta bekleyin.',
        step6: 'E-postada sağlanan bağlantıdan zip dosyasını indirin.',
      },
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
      displayStats(data); // Ensure stats are displayed with the correct language
    }
  }

  if (languageEn) {
    languageEn.addEventListener('click', () => switchLanguage('en'));
  }

  if (languageTr) {
    languageTr.addEventListener('click', () => switchLanguage('tr'));
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
});
