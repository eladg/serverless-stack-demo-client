import React, { useState, useEffect } from "react";
import { API }           from "aws-amplify";
import { Link }          from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import { useAppContext } from "../libs/contextLib";
import { Row, Col }      from "react-bootstrap";
import { onError }       from "../libs/errorLib";
import ListGroup         from "react-bootstrap/ListGroup";
import InputGroup        from "react-bootstrap/InputGroup";
import Form              from 'react-bootstrap/Form'
import FormControl       from "react-bootstrap/FormControl"
import Button            from 'react-bootstrap/Button'
import Collapse          from 'react-bootstrap/Collapse'

import { BsPencilSquare, BsSearch, BsArrowRepeat } from "react-icons/bs";
import "./Home.css";

export default function Home() {
  const [notes, setNotes] = useState([]);
  const { isAuthenticated } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [presentedNotes, setPresentedNotes] = useState([]);
  const [needReload, setNeedReload] = useState(false);
  const [searchAndReplaceUI, setSearchAndReplaceUI] = useState(false);

  function loadNotes() {
    const notes = API.get("notes", "/notes");
    return notes;
  }

  useEffect(() => {
    async function onLoad() {
      if (!isAuthenticated) {
        return;
      }

      try {
        const fetchNotes = async () => {
          const notes = await loadNotes();
          setNotes(notes);
          setPresentedNotes(notes);
          setIsLoading(false);
        };
      
        fetchNotes();
      } catch (e) {
        onError(e);
      }

      setNeedReload(false);
    }

    onLoad();
  }, [isAuthenticated, isLoading, needReload]);

  function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  function filterNotes(text) {
    return notes.filter(note => note.content.match(new RegExp(text, 'i')));
  }

  function updateTextPromise(note, text) {
    return new Promise(( resolve, reject ) => {
      if (text.length > 0) {
        API.put("notes", `/notes/${note.noteId}`, {
          body: {
            content: text, 
            attachment: note.attachment,
          }
        })
        .then( (res) => {
          console.log(`Note "${note.noteId}" was updated succesfully!`);
          resolve(res);
        })
        .catch( (err) => {
          console.error(`Error updating "${note.noteId}": ${err}`);
          reject(err);
        });
      } else {
        reject(new Error("Note content can not be empty."));
      }
    });
  }

  function searchAndReplaceAllNotes(findStr, replaceStr) {
    let selectedNotes = filterNotes(findStr);
    if (selectedNotes.length > 0) {
      let requests = selectedNotes.map((note) => {
        // replace all strings
        let newContent = note.content.replaceAll(findStr, replaceStr);
  
        // collect all promises
        return updateTextPromise(note, newContent);
      });
  
      Promise.all(requests)
      .then((results) => {
        alert(`Succesfully updated ${results.length} notes!`);
      })
      .then ((results) => {
        setNeedReload(true);
      })    
      .catch((err) => {
        alert(`Error updating note: ${err}`);
      })  
    } else {
      alert(`Sorry, could not find notes with text: '${findStr}'`);
    }
  }

  function searchNotesHandler(event) {
    const text = event.target.value.replace(/\W/g, '')
    setPresentedNotes(filterNotes(text));
  }

  function replaceNotesHandler(event) {
    event.preventDefault();
    
    // DOM elements
    const findValue = event.target.find.value;
    const replaceValue = event.target.replace.value;

    searchAndReplaceAllNotes(findValue, replaceValue);
  }

  function renderNotesList(notes) {
    if (isLoading === true) {
      return loadingNotesIndicator();
    }

    return (
      <>
        <Row className="mb-2">
          <Col xs="auto" >
            <Button variant="outline-dark" onClick={() => setSearchAndReplaceUI(!searchAndReplaceUI)}>
              <span>Search & Replace</span>
            </Button>
          </Col>
        </Row>
        
        <Collapse in={searchAndReplaceUI}>
          <Form onSubmit={replaceNotesHandler}>
            <Form.Row>
              <Col>
                <InputGroup>
                  <InputGroup.Prepend>
                    <InputGroup.Text id="search-input"><BsSearch/></InputGroup.Text>
                  </InputGroup.Prepend>
                  <FormControl placeholder="Search Notes" aria-label="search" onChange={debounce(searchNotesHandler, 300)} />
                </InputGroup>            
              </Col>
            </Form.Row>
            <Form.Row className='mt-2 mb-2'>
              <Col>
                <InputGroup>
                  <InputGroup.Prepend>
                    <InputGroup.Text><BsSearch/></InputGroup.Text>
                  </InputGroup.Prepend>
                  <FormControl placeholder="Find" name="find" aria-label="search-replace" />
                </InputGroup>
              </Col>
              <Col>
                <InputGroup>
                    <InputGroup.Prepend>
                      <InputGroup.Text><BsArrowRepeat/></InputGroup.Text>
                    </InputGroup.Prepend>
                  <FormControl placeholder="Replace" name="replace" aria-label="search-replace" />
                </InputGroup>
              </Col>
              <Col xs="auto">
                <Button type="submit" name="submitButton" variant="danger">Replace</Button>
              </Col>
            </Form.Row >
          </Form>
        </Collapse>

        <LinkContainer to="/notes/new">
          <ListGroup.Item action className="py-3 text-nowrap text-truncate">
            <BsPencilSquare size={17} />
            <span className="ml-2 font-weight-bold">Create a new note</span>
          </ListGroup.Item>
        </LinkContainer>

        {notes.map(({ noteId, content, createdAt }) => (
          <LinkContainer key={noteId} to={`/notes/${noteId}`}>
            <ListGroup.Item action>
              <span className="font-weight-bold">
                {content && content.trim().split("\n")[0]}
              </span>
              <br />
              <span className="text-muted">
                Created: {new Date(createdAt).toLocaleString()}
              </span>
            </ListGroup.Item>
          </LinkContainer>
        ))}
      </>
    );
  }

  function renderLander() {
    return (
      <div className="lander">
        <h1>Scratch</h1>
        <p className="text-muted">A simple note taking app</p>
        <div className="pt-3">
          <Link to="/login" className="btn btn-info btn-lg mr-3">
            Login
          </Link>
          <Link to="/signup" className="btn btn-success btn-lg">
            Signup
          </Link>
        </div>
      </div>
    );
  }

  function loadingNotesIndicator() {
    return (
      <div style={{textAlign: "center"}}>
        <div className="lds-dual-ring"></div>
      </div>
    );
  }

  function renderNotes() {
    return (
      <div className="notes">
        <h2 className="pb-3 mt-4 mb-3 border-bottom">Your Notes</h2>
        <ListGroup>{renderNotesList(presentedNotes)}</ListGroup>
      </div>
    );
  }
  
  return (
    <div className="Home">
      {isAuthenticated ? renderNotes() : renderLander()}
    </div>
  );
}
