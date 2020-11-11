

// store.set('person', { name:'Thomas' })
// console.log( store.get('person').name == 'Thomas' )


class FriendRank {

	people = store.get('people') || {}
	questions = store.get('questions') || {}
	answers = store.get('answers') || []

	/*
		STRUCTURE:

		people = {
			'personID': {
				name: String,
				timeAdded: Number,
				// hidden: Boolean,
			}
		}
		question = {
			'questionID': {
				question: String,
				ranking: Number,
				timeAdded: Number,
				// hidden: Boolean,
			}
		}
		answers = [
			{
				questionID: String,
				sortedPersonIDs: [String],
				timeAdded: Number,
			}
		]
	*/
	
	uuidv4() {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		)
	}
	
	saveData(){
		store.set('people', this.people)
		store.set('questions', this.questions)
		store.set('answers', this.answers)
	}

	addPerson(personObj){
		return new Promise((resolve)=>{
			const newPersonID = this.uuidv4()
			this.people[newPersonID] = personObj
			this.saveData()
			resolve()
		})
	}
	updatePerson(personID, newPersonObj){
		return new Promise((resolve)=>{
			this.people[personID] = newPersonObj
			this.saveData()
			resolve()
		})
	}
	deletePerson(personID_to_delete){
		return new Promise((resolve)=>{
			this.answers = this.answers.map(answer => ({
				...answer,
				sortedPersonIDs: sortedPersonIDs.filter(personID => personID !== personID_to_delete)
			}))
			delete this.people[personID_to_delete]
			this.saveData()
			resolve()
		})
	}

	addQuestion(questionObj){
		return new Promise((resolve)=>{
			const newQuestionID = this.uuidv4()
			this.questions[newQuestionID] = questionObj
			this.saveData()
			resolve()
		})
	}
	updateQuestion(questionID, newQuestionObj){
		return new Promise((resolve)=>{
			this.questions[questionID] = newQuestionObj
			this.saveData()
			resolve()
		})
	}
	deleteQuestion(questionID_to_delete){
		return new Promise((resolve)=>{
			this.answers = this.answers.filter(answer => answer.questionID !== questionID_to_delete)
			delete this.questions[questionID_to_delete]
			this.saveData()
			resolve()
		})
	}

	addAnswer(answerObj){
		return new Promise((resolve)=>{
			this.answers.push(answerObj)
			this.saveData()
			resolve()
		})
	}



	rankPeople(){
		// const questionIDs = []
		// const timeFrame_endTS = new Date()*1
		// const timeFrame_startTS = timeFrame_endTS - 15778800 // 15778800 = 6 month

		let people = this.answers
		// .filter(answer => (
		// 	answer.timeAdded > timeFrame_startTS
		// 	&& answer.timeAdded < timeFrame_endTS
		// ))
		.reduce((people, answer) => {
			const sortedPersonIDs = answer.sortedPersonIDs
			const stepLength = 1/sortedPersonIDs.length

			let questionWeight = 1
			if (!!this.questions[answer.questionID]){
				questionWeight = this.questions[answer.questionID].ranking
			}

			let currentRank = 1
			for (const personID of sortedPersonIDs) {
				if (!(!!people[personID])) {
					people[personID] = {
						score: 0,
						count: 0,
					}
				}
				
				people[personID].score += currentRank * questionWeight
				people[personID].count += 1

				currentRank -= stepLength
			}

			return people
		}, {})

		people = Object.entries(people)
		.map(personEntry => ({
			personID: personEntry[0],
			score: personEntry[1].score / personEntry[1].count,
			name: this.people[personEntry[0]].name,
			timeAdded: this.people[personEntry[0]].timeAdded,
		}))

		const rankedPeopleIDs = people.map(person => person.personID)

		for (const personEntry of Object.entries(this.people)) {
			if (!rankedPeopleIDs.includes(personEntry[0])) {
				people.push({
					personID: personEntry[0],
					score: 0,
					name: personEntry[1].name,
					timeAdded: personEntry[1].timeAdded,
				})
			}
		}
		
		people = people.sort((a, b) => {
			const n = b.score - a.score
			if (n !== 0) {
				return n
			}
			return a.timeAdded - b.timeAdded
		})

		return people
	}
}




}



const deleteButtonSVG = '<svg class="deleteButton" viewBox="0 0 24 24" width="18" height="18"><path d="M6 21h12V7H6v14zm2.46-9.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>'
// const deleteButtonSVG = '<svg class="deleteButton" viewBox="0 0 24 24" width="24" height="24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>'

async function deletePerson(personID){
	await friend_rank.deletePerson(personID)
	render_personList()
	render_rankingQuestion()
}

function render_personList(){
	const personListElement = document.querySelector('#personList ol')

	let people = friend_rank.rankPeople()
	if (people.length > 0) {
		personListElement.innerHTML = ''
		console.log('people', people)
		for (const entry of people) {
			const newPersonElement = document.createElement('li')
			newPersonElement.innerHTML = `
				<div class="oneRowStretch">
					<div style="width: 100%;">${entry.name}</div>
					<div class="actionRow">
						${deleteButtonSVG}
					</div>
				</div>
			`

			const deleteButton = newPersonElement.querySelector('.deleteButton')
			deleteButton.addEventListener('click', ()=>deletePerson(entry.personID))

			personListElement.appendChild(newPersonElement)
		}
	}else{
		personListElement.innerHTML = '<em>no people yet</em>'
	}
}

function render_questionList(){
	const questionListElement = document.querySelector('#questionList ul')

	const questions = Object.entries(friend_rank.questions)
	if (questions.length > 0) {
		questionListElement.innerHTML = ''
		for (const entry of questions) {
			const newQuestionElement = document.createElement('li')
			newQuestionElement.innerHTML = entry[1]
			questionListElement.appendChild(newQuestionElement)
		}
	}else{
		questionListElement.innerHTML = '<em>no questions yet</em>'
	}
}

function render_rankingQuestion(){
	// const questionListElement = document.querySelector('#questionList ul')
	
	const people = Object.entries(friend_rank.people)
	const questions = Object.entries(friend_rank.questions)
	
	if (people.length > 0 && questions.length > 0) {
		console.log('hej')
	}
}

function addPerson(){
	const textField = document.querySelector('#addPerson input[name="name"]')
	const value = textField.value
	if (value !== '') {
		friend_rank.addPerson(value)
		textField.value = ''
		render_personList()
	}
}
function addQuestion(){
	const textField = document.querySelector('#addQuestion input[name="question"]')
	const value = textField.value
	if (value !== '') {
		friend_rank.addQuestion(value)
		textField.value = ''
		render_questionList()
	}
}




var friend_rank,
personRankingListElement, personRankingSortable,
questionListElement, questionSortable


function start(){
	friend_rank = new FriendRank()

	personRankingListElement = document.querySelector('#personRanking ol')
	personRankingSortable = Sortable.create(personRankingListElement)

	questionListElement = document.querySelector('#questionList ol')
	questionSortable = Sortable.create(questionListElement, {
		onEnd: () => saveQuestionsRanking(),
	})

	render_personList()
	render_questionList()
	render_rankingQuestion()
}

window.addEventListener('load', ()=>{
	start()
})