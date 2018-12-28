import React from 'react';


const styles = {
  root: {
    backgroundColor: '#333',
    border: '1px solid #222',
    padding: 10,
    fontSize: '2em',
  },
  active: {
    backgroundColor: '#99ff99',
  },
};


export default ({ text, active, onClick }) => (
  <button
    style={(active) ?  { ...styles.root, ...styles.active } : styles.root}
    onClick={onClick}
  >{text}</button>
);
