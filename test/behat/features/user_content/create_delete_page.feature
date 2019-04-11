@javascript @core @portfolio
Feature: Creating a page with stuff in it
   In order to have a portfolio
   As a user I need navigate to to portfolio
   So I can create a page and add content to it

Background:
    Given the following "users" exist:
    | username | password | email | firstname | lastname | institution | authname | role |
    | UserA | Kupuh1pa! | UserA@example.org | Angela | User | mahara | internal | member |

Scenario: Creating a page with content in it (Bug 1426983)
    # Log in as "Admin" user
    Given I log in as "admin" with password "Kupuh1pa!"
    # set up for being able to use an image in WYSIWYG editor
    And I choose "Files" in "Create" from main menu
    And I attach the file "Image2.png" to "files_filebrowser_userfile"
    # Navigating to Portfolio to create a page
    # This is the test for manually creating a page
    And I choose "Pages and collections" in "Create" from main menu
    And I scroll to the base of id "addview-button"
    And I should see "Pages and collections" in the "h1 heading" property
    And I follow "Add"
    And I click on "Page" in the dialog
    And I fill in the following:
    | Page title | Test view |
    And I fill in "First description" in first editor
    And I press "Save"
    # verify page elements are displayed Display page and Return to pages and collections buttons
    And I should see "Display page" in the "Display page button" property
    And I should see "Return to pages and collections" in the "Return to pages and collections button" property
    # Editing the pages
    And I follow "Settings" in the "Toolbar buttons" property
    #Change the Page title
    And I fill in the following:
    | Page title | This is the edited page title |
    # Change the page description
    And I fill in "This is the edited description" in first editor
    # Upload an image into the WYSIWYG editor
    And I click the "Insert/edit image" button in the editor
    And I expand the section "Image"
    And I press "Select \"Image2.png\""
    And I press "Submit"
    And I wait "1" seconds
    And I press "Save"
    # Adding media blockAnd I fill in the following:
    | Page title | This is the edited page title |
    # confirm h1 page title displayed
    And I should see "This is the edited page title" in the "h1 heading" property
    # confirm settings, edit and share buttons displayed
    And I should see "Settings" in the ".editlayout .btn-title" element
    And I should see "Edit" in the ".editcontent .btn-title" element
    And I should see "Share" in the ".editshare .btn-title" element
    # Adding media block
    And I expand "Media" node
    And I follow "File(s) to download"
    And I press "Add"
    And I press "Save"
    # Adding Journal block
    And I expand "Journals" node in the "blocktype sidebar" property
    And I follow "Recent journal entries"
    And I press "Add"
    And I press "Save"
    And I scroll to the base of id "block-category-blog"
    And I collapse "Journals" node in the "blocktype sidebar" property
    # Adding profile info block
    And I expand "Personal info" node in the "blocktype sidebar" property
    And I follow "Profile information"
    And I press "Add"
    And I press "Save"
    # Adding external media block - but cancel out
    And I expand "External" node in the "blocktype sidebar" property
    And I follow "External media"
    And I press "Add"
    And I press "Remove"

    # verify page elements are displayed Display page and Return to pages and collections buttons
    And I should see "Display page" in the "Display page button" property
    And I should see "Return to pages and collections" in the "Return to pages and collections button" property
    And I display the page
    # Show last updated date and time when seeing a portfolio page (Bug 1634591)
    And I should see "Updated on" in the ".text-right" element
    # actual date format displayed is 31 May 2018, 1:29 PM
    And I should see the date "today" in the ".text-right" element with the format "d F Y"
    # Verifying the page title and description changed
    Then I should see "This is the edited page title"
    And I should see "This is the edited description"
    # Create a timeline version
    And I press "More..."
    And I follow "Save to timeline"
    # Check that the image is displayed on page and ensure the link is correct
    Then I should see image "Image2.png" on the page
    # The "..." button should only have the option to print and delete the page
    And I should see "More..."
    And I press "More..."
    Then I should see "Print"
    And I should see "Delete this page"
    # User share page with public and enable copy page functionality
    And I choose "Pages and collections" in "Create" from main menu
    And I click on "Manage access" in "This is the edited page title" card access menu
    And I follow "Advanced options"
    And I enable the switch "Allow copying"
    And I select "Public" from "General" in shared with select2 box
    And I press "Save"
    And I log out
    # Log in as UserA and copy the page
    Given I log in as "UserA" with password "Kupuh1pa!"
    And I wait "1" seconds
    Then I should see "This is the edited page title"
    When I follow "This is the edited page title"
    And I press "More options"
    And I follow "Copy"
    And I fill in the following:
    | Page title | This is my page now |
    And I press "Save"
    And I follow "Display page"
    # Check that the image is displayed on copied page and ensure the link is correct
    Then I should see image "Image2.png" on the page
    And I log out

    # check page can be deleted (Bug 1755682)
    Given I log in as "admin" with password "Kupuh1pa!"
    # Go to version page
    And I choose "Pages and collections" in "Create" from main menu
    And I follow "This is the edited page title"
    And I press "More..."
    And I follow "Timeline"

    Then I should see "Timeline"
    # check page can be deleted (Bug 1755682)
    And I choose "Pages and collections" in "Create" from main menu
    And I click on "Delete" in "This is the edited page" card menu
    And I should see "Do you really want to delete this page?"
    And I press "Yes"
    Then I should see "Page deleted"
    And I should not see "This is the edited page"
