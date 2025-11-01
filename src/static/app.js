document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const searchInput = document.getElementById("search");
  const categoryFilter = document.getElementById("category-filter");
  const sortBySelect = document.getElementById("sort-by");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  let allActivities = {}; // will hold fetched activities

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Save fetched data
      allActivities = activities;

      // Populate category filter options
      populateCategoryFilter(activities);

      // Render list according to current filters
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function populateCategoryFilter(activities) {
    const categories = new Set();
    Object.values(activities).forEach((a) => {
      if (a.category) categories.add(a.category);
    });

    // Clear existing options except the first
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }

    Array.from(categories).sort().forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
  }

  function renderActivities() {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = "";

    // add default select placeholder
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Select an activity --";
    activitySelect.appendChild(placeholder);

    const term = (searchInput.value || "").toLowerCase().trim();
    const category = categoryFilter.value;
    const sortBy = sortBySelect.value;

    const entries = Object.entries(allActivities)
      .filter(([name, details]) => {
        // search filter
        const matchesSearch =
          name.toLowerCase().includes(term) ||
          details.description.toLowerCase().includes(term);

        // category filter
        const matchesCategory = category ? details.category === category : true;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const [nameA, detA] = a;
        const [nameB, detB] = b;
        if (sortBy === "name_asc") return nameA.localeCompare(nameB);
        if (sortBy === "name_desc") return nameB.localeCompare(nameA);
        if (sortBy === "schedule") return detA.schedule.localeCompare(detB.schedule);
        return 0;
      });

    entries.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Category:</strong> ${details.category || "—"}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);

      // Add option to select dropdown
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  // wire up filters
  searchInput.addEventListener("input", () => renderActivities());
  categoryFilter.addEventListener("change", () => renderActivities());
  sortBySelect.addEventListener("change", () => renderActivities());
  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    sortBySelect.value = "name_asc";
    renderActivities();
  });

  fetchActivities();
});
