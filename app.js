import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


/*
  LATER, YOU WILL REPLACE THESE FIREBASE VALUES
  WITH YOUR REAL FIREBASE PROJECT INFORMATION.
*/

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};


/*
  REPLACE THESE TWO EMAILS LATER.

  First email = Starshe
  Second email = You
*/

const ADMIN_EMAILS = [
  "starshe@example.com",
  "your-email@example.com"
].map((email) => email.toLowerCase());


function isApprovedAdmin(user) {
  return Boolean(
    user &&
    user.email &&
    ADMIN_EMAILS.includes(user.email.toLowerCase())
  );
}


const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);

const database = getFirestore(firebaseApp);

const storage = getStorage(firebaseApp);

const mediaCollection = collection(database, "media");


const year = document.getElementById("year");

const menuButton = document.getElementById("menuButton");

const navLinks = document.getElementById("navLinks");

const musicGrid = document.getElementById("musicGrid");

const videoGrid = document.getElementById("videoGrid");


const loginModal = document.getElementById("loginModal");

const adminModal = document.getElementById("adminModal");

const openLoginButton = document.getElementById("openLoginButton");

const closeLoginButton = document.getElementById("closeLoginButton");

const closeAdminButton = document.getElementById("closeAdminButton");

const logoutButton = document.getElementById("logoutButton");

const signedInAdmin = document.getElementById("signedInAdmin");


const loginForm = document.getElementById("loginForm");

const loginMessage = document.getElementById("loginMessage");


const musicUploadForm = document.getElementById("musicUploadForm");

const videoUploadForm = document.getElementById("videoUploadForm");

const musicProgress = document.getElementById("musicProgress");

const videoProgress = document.getElementById("videoProgress");

const musicMessage = document.getElementById("musicMessage");

const videoMessage = document.getElementById("videoMessage");

const adminMediaList = document.getElementById("adminMediaList");


year.textContent = new Date().getFullYear();


menuButton.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});


document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
  });
});


function openModal(modal) {
  modal.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}


function closeModal(modal) {
  modal.classList.add("hidden");

  document.body.style.overflow = "";
}


openLoginButton.addEventListener("click", () => {
  openModal(loginModal);
});


closeLoginButton.addEventListener("click", () => {
  closeModal(loginModal);
});


closeAdminButton.addEventListener("click", () => {
  closeModal(adminModal);
});


loginModal.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    closeModal(loginModal);
  }
});


adminModal.addEventListener("click", (event) => {
  if (event.target === adminModal) {
    closeModal(adminModal);
  }
});


loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "Signing in...";


  const email = document
    .getElementById("loginEmail")
    .value
    .trim()
    .toLowerCase();


  const password = document
    .getElementById("loginPassword")
    .value;


  if (!ADMIN_EMAILS.includes(email)) {
    loginMessage.textContent =
      "This email is not approved as an administrator.";

    return;
  }


  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );


    loginMessage.textContent = "";

    loginForm.reset();

    closeModal(loginModal);

    openModal(adminModal);

  } catch (error) {
    console.error(error);

    loginMessage.textContent =
      "Login failed. Check the email and password.";
  }
});


logoutButton.addEventListener("click", async () => {
  await signOut(auth);

  closeModal(adminModal);
});


onAuthStateChanged(auth, async (user) => {
  if (user && !isApprovedAdmin(user)) {
    await signOut(auth);

    return;
  }


  if (isApprovedAdmin(user)) {
    signedInAdmin.textContent =
      `Signed in as ${user.email}`;

  } else {
    signedInAdmin.textContent = "";

    closeModal(adminModal);
  }
});


document
  .querySelectorAll(".tab-button")
  .forEach((button) => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".tab-button")
        .forEach((item) => {

          item.classList.remove("active");

        });


      document
        .querySelectorAll(".upload-panel")
        .forEach((panel) => {

          panel.classList.remove("active");

        });


      button.classList.add("active");


      document
        .getElementById(button.dataset.tab)
        .classList.add("active");

    });

  });


function cleanFileName(name) {
  return name.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
}


function uniqueStoragePath(folder, file) {
  const safeName = cleanFileName(file.name);

  return `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}


function uploadFile(
  file,
  storagePath,
  progressElement
) {

  return new Promise((resolve, reject) => {

    const fileReference = ref(
      storage,
      storagePath
    );


    const uploadTask = uploadBytesResumable(
      fileReference,
      file,
      {
        contentType: file.type
      }
    );


    uploadTask.on(

      "state_changed",

      (snapshot) => {

        const percent =
          (
            snapshot.bytesTransferred /
            snapshot.totalBytes
          ) * 100;


        progressElement.value = percent;

      },

      reject,

      async () => {

        const downloadURL =
          await getDownloadURL(
            uploadTask.snapshot.ref
          );


        resolve({
          url: downloadURL,
          path: storagePath
        });

      }

    );

  });

}


function validateFile(
  file,
  allowedPrefix,
  maxSizeMB
) {

  if (
    !file ||
    !file.type.startsWith(allowedPrefix)
  ) {

    throw new Error(
      `Please select a valid ${allowedPrefix.replace("/", "")} file.`
    );

  }


  const maxBytes =
    maxSizeMB * 1024 * 1024;


  if (file.size > maxBytes) {

    throw new Error(
      `The file must be smaller than ${maxSizeMB} MB.`
    );

  }

}


musicUploadForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!isApprovedAdmin(auth.currentUser)) {

      musicMessage.textContent =
        "Administrator login required.";

      return;

    }


    const title = document
      .getElementById("songTitle")
      .value
      .trim();


    const coverFile = document
      .getElementById("songCover")
      .files[0];


    const audioFile = document
      .getElementById("songFile")
      .files[0];


    try {

      validateFile(
        coverFile,
        "image/",
        10
      );


      validateFile(
        audioFile,
        "audio/",
        100
      );


      musicMessage.textContent =
        "Uploading cover image...";


      musicProgress.value = 0;


      const coverUpload =
        await uploadFile(

          coverFile,

          uniqueStoragePath(
            "covers",
            coverFile
          ),

          musicProgress

        );


      musicMessage.textContent =
        "Uploading song...";


      musicProgress.value = 0;


      const audioUpload =
        await uploadFile(

          audioFile,

          uniqueStoragePath(
            "music",
            audioFile
          ),

          musicProgress

        );


      await addDoc(
        mediaCollection,
        {

          type: "music",

          title: title,

          coverURL: coverUpload.url,

          coverPath: coverUpload.path,

          mediaURL: audioUpload.url,

          mediaPath: audioUpload.path,

          uploadedBy:
            auth.currentUser.email,

          createdAt:
            serverTimestamp()

        }
      );


      musicUploadForm.reset();

      musicProgress.value = 0;

      musicMessage.textContent =
        "Song uploaded successfully.";

    } catch (error) {

      console.error(error);

      musicMessage.textContent =
        error.message ||
        "The song upload failed.";

    }

  }
);


videoUploadForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!isApprovedAdmin(auth.currentUser)) {

      videoMessage.textContent =
        "Administrator login required.";

      return;

    }


    const title = document
      .getElementById("videoTitle")
      .value
      .trim();


    const thumbnailFile = document
      .getElementById("videoThumbnail")
      .files[0];


    const videoFile = document
      .getElementById("videoFile")
      .files[0];


    try {

      validateFile(
        thumbnailFile,
        "image/",
        10
      );


      validateFile(
        videoFile,
        "video/",
        500
      );


      videoMessage.textContent =
        "Uploading thumbnail...";


      videoProgress.value = 0;


      const thumbnailUpload =
        await uploadFile(

          thumbnailFile,

          uniqueStoragePath(
            "thumbnails",
            thumbnailFile
          ),

          videoProgress

        );


      videoMessage.textContent =
        "Uploading video...";


      videoProgress.value = 0;


      const uploadedVideo =
        await uploadFile(

          videoFile,

          uniqueStoragePath(
            "videos",
            videoFile
          ),

          videoProgress

        );


      await addDoc(
        mediaCollection,
        {

          type: "video",

          title: title,

          thumbnailURL:
            thumbnailUpload.url,

          thumbnailPath:
            thumbnailUpload.path,

          mediaURL:
            uploadedVideo.url,

          mediaPath:
            uploadedVideo.path,

          uploadedBy:
            auth.currentUser.email,

          createdAt:
            serverTimestamp()

        }
      );


      videoUploadForm.reset();

      videoProgress.value = 0;

      videoMessage.textContent =
        "Video uploaded successfully.";

    } catch (error) {

      console.error(error);

      videoMessage.textContent =
        error.message ||
        "The video upload failed.";

    }

  }
);


async function removeMedia(item) {

  if (!isApprovedAdmin(auth.currentUser)) {

    alert("Administrator login required.");

    return;

  }


  const confirmed =
    window.confirm(
      `Delete "${item.title}" permanently?`
    );


  if (!confirmed) {
    return;
  }


  try {

    const storagePaths = [

      item.mediaPath,

      item.coverPath,

      item.thumbnailPath

    ].filter(Boolean);


    await Promise.all(

      storagePaths.map(
        async (path) => {

          try {

            await deleteObject(
              ref(storage, path)
            );

          } catch (error) {

            console.warn(
              "A file was already missing:",
              path,
              error
            );

          }

        }
      )

    );


    await deleteDoc(

      doc(
        database,
        "media",
        item.id
      )

    );

  } catch (error) {

    console.error(error);

    alert(
      "This upload could not be deleted."
    );

  }

}


function makeMusicCard(item) {

  const card =
    document.createElement("article");

  card.className = "media-card";


  const image =
    document.createElement("img");

  image.src = item.coverURL;

  image.alt = `${item.title} cover`;


  const content =
    document.createElement("div");

  content.className = "media-content";


  const heading =
    document.createElement("h3");

  heading.textContent = item.title;


  const audio =
    document.createElement("audio");

  audio.controls = true;

  audio.preload = "metadata";

  audio.src = item.mediaURL;


  content.append(
    heading,
    audio
  );


  card.append(
    image,
    content
  );


  return card;
}


function makeVideoCard(item) {

  const card =
    document.createElement("article");

  card.className =
    "media-card video-card";


  const video =
    document.createElement("video");

  video.controls = true;

  video.preload = "metadata";

  video.poster = item.thumbnailURL;

  video.src = item.mediaURL;


  const content =
    document.createElement("div");

  content.className = "media-content";


  const heading =
    document.createElement("h3");

  heading.textContent = item.title;


  content.append(heading);


  card.append(
    video,
    content
  );


  return card;
}


function renderAdminList(items) {

  adminMediaList.innerHTML = "";


  if (!items.length) {

    adminMediaList.innerHTML =
      '<p class="empty-message">There are no uploads yet.</p>';

    return;

  }


  items.forEach((item) => {

    const row =
      document.createElement("div");

    row.className =
      "admin-list-item";


    const label =
      document.createElement("div");


    const title =
      document.createElement("strong");

    title.textContent = item.title;


    const details =
      document.createElement("small");

    details.textContent =
      `${item.type}${
        item.uploadedBy
          ? ` • Uploaded by ${item.uploadedBy}`
          : ""
      }`;


    label.append(

      title,

      document.createElement("br"),

      details

    );


    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "delete-button";

    deleteButton.textContent =
      "Delete";


    deleteButton.addEventListener(
      "click",
      () => {

        removeMedia(item);

      }
    );


    row.append(
      label,
      deleteButton
    );


    adminMediaList.append(row);

  });

}


const mediaQuery = query(

  mediaCollection,

  orderBy(
    "createdAt",
    "desc"
  )

);


onSnapshot(

  mediaQuery,

  (snapshot) => {

    const items =
      snapshot.docs.map(
        (documentSnapshot) => ({

          id:
            documentSnapshot.id,

          ...documentSnapshot.data()

        })
      );


    const music =
      items.filter(
        (item) =>
          item.type === "music"
      );


    const videos =
      items.filter(
        (item) =>
          item.type === "video"
      );


    musicGrid.innerHTML = "";

    videoGrid.innerHTML = "";


    if (!music.length) {

      musicGrid.innerHTML =
        '<p class="empty-message">No music has been uploaded yet.</p>';

    } else {

      music.forEach((item) => {

        musicGrid.append(
          makeMusicCard(item)
        );

      });

    }


    if (!videos.length) {

      videoGrid.innerHTML =
        '<p class="empty-message">No videos have been uploaded yet.</p>';

    } else {

      videos.forEach((item) => {

        videoGrid.append(
          makeVideoCard(item)
        );

      });

    }


    renderAdminList(items);

  },

  (error) => {

    console.error(error);


    musicGrid.innerHTML =
      '<p class="empty-message">Unable to load music.</p>';


    videoGrid.innerHTML =
      '<p class="empty-message">Unable to load videos.</p>';

  }

);
