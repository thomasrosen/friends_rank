

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
				position: Number,
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
				questionWeight = this.questions[answer.questionID].position
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

	exportEverything(){
		return {
			people: this.people,
			questions: this.questions,
			answers: this.answers,
		}
	}
}





/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
	// SOURCE: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getRandomIntInclusive(min, max) {
	// SOURCE: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive 
}



const deleteButtonSVG = '<svg class="deleteButton" viewBox="0 0 24 24" width="18" height="18"><path d="M6 21h12V7H6v14zm2.46-9.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>'
// const deleteButtonSVG = '<svg class="deleteButton" viewBox="0 0 24 24" width="24" height="24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>'
const moveButtonSVG = '<svg class="moveButton" viewBox="0 0 24 24" width="24" height="24"><path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/></svg>'

async function deletePerson(personID){
	await friend_rank.deletePerson(personID)
	render_personList()
	render_rankingQuestion()
}

async function deleteQuestion(questionID){
	await friend_rank.deleteQuestion(questionID)
	render_questionList()
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
	// const questionListElement = document.querySelector('#questionList ul')

	let questions = Object.entries(friend_rank.questions)
	if (questions.length > 0) {
		questions = questions.sort((a, b) => {
			const n = b[1].ranking - a[1].ranking
			if (n !== 0) {
				return n
			}
			return a[1].timeAdded - b[1].timeAdded
		})

		questionListElement.innerHTML = ''
		for (const entry of questions) {
			const questionID = entry[0]
			const newQuestionElement = document.createElement('li')
			newQuestionElement.setAttribute('data-id', questionID)
			newQuestionElement.innerHTML = `
				<div class="oneRowStretch">
					<div style="width: 100%;">${entry[1].question}</div>
					<div class="actionRow">
						${deleteButtonSVG}
						${moveButtonSVG}
					</div>
				</div>
			`

			const deleteButton = newQuestionElement.querySelector('.deleteButton')
			deleteButton.addEventListener('click', ()=>deleteQuestion(questionID))

			questionListElement.appendChild(newQuestionElement)
		}
	}else{
		questionListElement.innerHTML = '<em>no questions yet</em>'
	}
}

function render_rankingQuestion(){
	let people = Object.entries(friend_rank.people)
	const questions = Object.entries(friend_rank.questions)

	const minPeople = 2
	const maxPeople = 4
	
	if (people.length >= minPeople && questions.length > 0) {
		document.querySelector('#personRanking').style.display = 'block'

		const questionEntry = questions[Math.floor(Math.random() * questions.length)]
		const questionForRankingElement = document.querySelector('#questionForRanking')
		questionForRankingElement.setAttribute('data-id', questionEntry[0])
		questionForRankingElement.innerHTML = questionEntry[1].question

		const peopleAmount = getRandomIntInclusive(minPeople, maxPeople)
		people = shuffle(people).slice(0, peopleAmount)

		const personRankingListElement = document.querySelector('#personRanking ol')
		personRankingListElement.innerHTML = ''
		for (const personEntry of people) {
			const newPersonElement = document.createElement('li')
			newPersonElement.setAttribute('data-id', personEntry[0])
			newPersonElement.innerHTML = `
				<div class="oneRowStretch">
					<div style="width: 100%;">${personEntry[1].name}</div>
					<div class="actionRow">
						${moveButtonSVG}
					</div>
				</div>
			`

			personRankingListElement.appendChild(newPersonElement)
		}
	}else{
		document.querySelector('#personRanking').style.display = 'none'
	}
}

async function addPerson(){
	const textField = document.querySelector('#addPerson input[name="name"]')
	const value = textField.value
	if (value !== '') {
		await friend_rank.addPerson({
			name: value,
			timeAdded: new Date()*1,
		})
		textField.value = ''
		render_personList()
		render_rankingQuestion()
	}
}
async function addQuestion(){
	const textField = document.querySelector('#addQuestion textarea[name="question"]')
	const value = textField.value
	if (value !== '') {
		await friend_rank.addQuestion({
			question: value,
			position: 1,
			timeAdded: new Date()*1,
		})
		textField.value = ''
		render_questionList()
		render_rankingQuestion()
	}
}

async function savePersonRanking(){
	const questionForRankingElement = document.querySelector('#questionForRanking')
	const questionID = questionForRankingElement.getAttribute('data-id')

	const sortedPersonIDs = personRankingSortable.toArray()
	await friend_rank.addAnswer({
		questionID,
		sortedPersonIDs,
		timeAdded: new Date()*1,
	})

	render_personList()
	render_rankingQuestion()
}
function saveQuestionsRanking(){
	const sortedQuestionIDs = questionSortable.toArray()
	const stepLength = 1/sortedQuestionIDs.length
	let currentPosition = 1
	for (const questionID of sortedQuestionIDs) {
		friend_rank.updateQuestion(questionID, {
			...friend_rank.questions[questionID],
			position: currentPosition,
		})
		currentPosition -= stepLength
	}

	render_personList()
}

function downloadJSON(filename, mimeType, encodedData) {
	const download_a_tag = document.querySelector('#dowloadTrigger')
	download_a_tag.download = filename
	download_a_tag.href = `data:${mimeType};base64,${encodedData}`
	download_a_tag.click()

	// location.href = "data:application/json;base64,"+btoa(JSON.stringify(jsObject))
}
function exportEverything(){
	downloadJSON('everything.json', 'application/json', btoa(JSON.stringify(friend_rank.exportEverything(),null,'\t')))
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