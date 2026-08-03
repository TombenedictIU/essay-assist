# Essay Assist

Build a full-stack web application named "EvalQueue," an automated essay evaluation system for university professors and students. The application must feature Role-Based Access Control (RBAC), an asynchronous text-evaluation engine, and a clean, responsive UI. 

TECH STACK:

* Frontend: React with Vite, Tailwind CSS, and Lucide Icons for UI elements.

* Backend: Node.js/Express.

* Database: SQLite (for easy portability).

* Deployment: Generate a fully functional `docker-compose.yml` file and Dockerfile at the root of the project to run both the frontend and backend.

DATABASE SCHEMA:

* Users: id, name, email, password_hash, role ('Student' or 'Instructor').

* Assignments: id, instructor_id, title, description, required_keywords (comma-separated string).

* Submissions: id, assignment_id, student_id, content (text), status ('Pending', 'Evaluated', 'Graded'), similarity_score (integer 0-100), final_grade (integer 0-100), instructor_feedback (text).

USER WORKFLOWS & UI:

* Authentication: A login and registration screen. Users select their role upon registration. Route them to their respective dashboards upon login.

* Instructor Dashboard: 

  - A view to create new assignments by entering a title, description, and a list of required keywords.

  - A view to see all student submissions.

  - A grading interface to view a specific submission, see the auto-generated `similarity_score`, override it with a `final_grade`, and leave `instructor_feedback`.

* Student Dashboard:

  - A view to see available assignments.

  - A submission form featuring a large text area to write or paste their essay.

  - A view to check their submission status and read the final grade and feedback.

CORE BUSINESS LOGIC (THE EVALUATION ENGINE):

* When a student submits an assignment, simulate an asynchronous background evaluation.

* The system should parse the student's `content` and check it against the assignment's `required_keywords`. 

* Calculate a `similarity_score` percentage based on how many of the required keywords appear in the text.

* Update the submission status from 'Pending' to 'Evaluated' once this calculation is complete.

STRICT REQUIREMENTS:

* Seed Data: The database MUST initialize with realistic test data. Include one Instructor account, two Student accounts, two pre-created assignments, and three mock submissions in various states (Pending, Graded). No generic "lorem ipsum" filler text.

* Architecture: Maintain a strict separation of concerns between the frontend presentation layer and backend API routes.

* Styling: Use a professional, academic aesthetic with a clean white/gray background and primary blue accents. Ensure tables and forms are highly legible.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
