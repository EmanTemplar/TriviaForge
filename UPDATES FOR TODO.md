**Player Changes**
1. Need to investigate better connection handling, socket.io works for small sessions, but appears to struggle with performance when in large states, need something similar or better to jackbox.tv games
2. Errors in sessions are seen as such:
    - Players have to refresh player page when they re-open their phone/switch back to the page from another app on mobile (sometimes have to refresh more than once)
    - Players appear to get incorrect answer windows (notification at bottom of screen saying something along the lines of "Yes, you got it right", vs. "Incorrect, you got it wrong"), the socket connections may not be sending out the correct notifications to the correct players
3. We need to add a submit answer modal window, a confirmation for players when they want to select their answer to prevent misclicks
4. The "stay-awake" status is not being shown on mobile, I can see it in a browser with mobile environment enabled, and on a desktop window, but mobile browsers are simply not showing it/it appears to not work anymore

**Presenter Changes**
1. Better visuals for the connected player sidebar, need to get rid of zombie disconnects, as that appears to cause constant reconnecting issues with current players (was originally added due to one instance of a bug where a player somehow got populated 12 times in one game). Need to modify the zombie handling to only account for replicates of the same player in the same room IF found. 
2. Want to add a notification of the presenter of when all players in the room have answered, giving an alert that can make it easier to know when to reveal the question (and also add an option in to Auto-Reveal the answer when everyone in the room has answered)
3. Make plans to automate the presenter role, give a timer for players (editable of course), a countdown until the answer is revealed (reveal early if all players answer before time runs out). Once all players have seen the answer after 10 seconds (or custom option), the question will move onto the next one automatically. 
4. Create a "solo-play" option for players, this will require more development on the player page, where they will be able to read the list of loaded quizzes in the database, and run up a session on their own without a host interaction. (All rooms still shown in the presenter page as such, but should have an indicator of a "self-ran" status)

**PRIORITY**
1. Solidify player connections, needs to be buttery smooth and as seamless as possible for the players and presenter
2. Answer confirmation modals for the players
3. Presenter Connected Players window visual enchancement/stability improvement for viewing players and answers