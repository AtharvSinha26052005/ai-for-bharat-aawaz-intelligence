# Bugfix Requirements Document

## Introduction

The Learn Finance page (Education.tsx) inconsistently displays interested schemes after users mark schemes as interested from the schemes page or dashboard recommendations. The page often shows "No Interested Schemes Yet" even after successfully marking schemes as interested. This intermittent behavior occurs because the Education page only loads interested schemes once on mount and does not refresh when users navigate back to it after marking new schemes as interested elsewhere in the application.

The bug impacts user experience by making the "I am interested" feature appear broken, as users cannot reliably see their saved schemes in the Learn Finance page where they expect to access financial advice.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user marks a scheme as interested from the schemes page or dashboard, THEN navigates to the Learn Finance page, THEN the system often displays "No Interested Schemes Yet" instead of showing the newly marked scheme

1.2 WHEN a user marks a scheme as interested, THEN navigates away from the Learn Finance page, THEN returns to the Learn Finance page, THEN the system does not refresh the interested schemes list and shows stale data

1.3 WHEN a user clears the browser cache and reloads the Learn Finance page, THEN the system sometimes displays the interested schemes correctly, but this behavior is inconsistent

1.4 WHEN the Education component mounts with a userId, THEN the system loads interested schemes only once via useEffect and does not reload when the component is revisited

### Expected Behavior (Correct)

2.1 WHEN a user marks a scheme as interested from any page (schemes page or dashboard), THEN navigates to the Learn Finance page, THEN the system SHALL display the newly marked scheme in the interested schemes list

2.2 WHEN a user navigates to the Learn Finance page, THEN the system SHALL always fetch the latest interested schemes data from the backend API

2.3 WHEN a user marks a scheme as interested, THEN the system SHALL ensure that subsequent visits to the Learn Finance page reflect the updated interested schemes list

2.4 WHEN the Education component becomes visible after being hidden (e.g., user switches tabs or navigates back), THEN the system SHALL refresh the interested schemes list to show the latest data

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user removes a scheme from the interested list on the Learn Finance page, THEN the system SHALL CONTINUE TO immediately update the display to remove that scheme

3.2 WHEN a user clicks "Get Financial Advice" for a scheme on the Learn Finance page, THEN the system SHALL CONTINUE TO display the financial advice dialog with personalized recommendations

3.3 WHEN a user has no interested schemes, THEN the system SHALL CONTINUE TO display the "No Interested Schemes Yet" message with a button to browse schemes

3.4 WHEN the Learn Finance page loads interested schemes, THEN the system SHALL CONTINUE TO display a loading spinner while fetching data

3.5 WHEN the API request to fetch interested schemes fails, THEN the system SHALL CONTINUE TO handle the error gracefully by logging it to the console without crashing the application
