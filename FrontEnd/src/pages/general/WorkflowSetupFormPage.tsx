import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";


interface LineLevel {
  Line_ID:number;
  SortLine:number;
  EnglishDescription:string;
}


interface TransactionType {
  TransactionType_ID:number;
  TypeName:string;
}


interface Department {

  Id:number;
  DepartmentName_English:string;
  DepartmentType:string;

}



export default function WorkflowSetupFormPage(){


const navigate = useNavigate();



const [transactionType,setTransactionType]
=
useState("");



const [transactionTypes,setTransactionTypes]
=
useState<TransactionType[]>([]);



const [lineLevels,setLineLevels]
=
useState<LineLevel[]>([]);



const [selectedLines,setSelectedLines]
=
useState<number[]>([]);



const [memberDepartments,setMemberDepartments]
=
useState<Department[]>([]);



const [selectedMembers,setSelectedMembers]
=
useState<number[]>([]);



const [minValue,setMinValue]
=
useState("");



const [maxValue,setMaxValue]
=
useState("");



const [comments,setComments]
=
useState("");



const [submitting,setSubmitting]
=
useState(false);



const [error,setError]
=
useState<string|null>(null);





// =================================
// Load Transaction Types
// =================================


useEffect(()=>{


const loadTransactionTypes = async()=>{


try{


const response =
await axios.get(
"http://localhost:3000/api/transaction-types"
);



let data:any[]=[];



if(Array.isArray(response.data))
data=response.data;


else if(Array.isArray(response.data.data))
data=response.data.data;


else if(Array.isArray(response.data.rows))
data=response.data.rows;



setTransactionTypes(data);



}
catch(err){


console.log(err);


setError(
"Failed to load transaction types"
);


}


};



loadTransactionTypes();



},[]);






// =================================
// Load Committee Members
// =================================


useEffect(()=>{


const loadMembers = async()=>{


try{


const response =
await axios.get(
"http://localhost:3000/departments/members"
);



console.log(
"MEMBERS RESPONSE:",
response.data
);



let data:any[]=[];



if(Array.isArray(response.data))

data=response.data;


else if(Array.isArray(response.data.data))

data=response.data.data;



setMemberDepartments(data);



}
catch(err){


console.log(err);


}



};



loadMembers();



},[]);








// =================================
// Load Line Levels
// =================================


useEffect(()=>{


const loadLineLevels = async()=>{


try{


const response =
await axios.get(
"http://localhost:3000/line-levels"
);



console.log(
"LINE LEVELS:",
response.data
);



let data:any[]=[];



if(Array.isArray(response.data))

data=response.data;


else if(Array.isArray(response.data.data))

data=response.data.data;




// Remove Employee
data =
data.filter(
x=>x.SortLine !== -1
);



setLineLevels(data);



}
catch(err){


console.log(err);


setError(
"Failed to load line levels"
);



}



};



loadLineLevels();



},[]);









// =================================
// Line Checkbox
// =================================


const handleLineChange=(line:number)=>{


if(selectedLines.includes(line)){


setSelectedLines(

selectedLines.filter(
x=>x!==line
)

);



}
else{


setSelectedLines([

...selectedLines,

line

]);



}


};






// =================================
// Member Checkbox
// =================================


const handleMemberChange=(id:number)=>{


if(selectedMembers.includes(id)){


setSelectedMembers(

selectedMembers.filter(
x=>x!==id
)

);



}
else{


setSelectedMembers([

...selectedMembers,

id

]);



}



};








// =================================
// Save
// =================================


const handleSubmit =
async(
event:React.FormEvent<HTMLFormElement>
)=>{


event.preventDefault();



setSubmitting(true);



try{



const body={



TransactionType_ID:
Number(transactionType),




StepNo:

[
...selectedLines
]
.sort((a,b)=>a-b)
.map(
x=>`line${x}`
)
.join(","),




MinValue:

minValue
?
Number(minValue)
:
null,




MaxValue:

maxValue
?
Number(maxValue)
:
null,




Comments:
comments,




Approval_Members:

selectedMembers.length>0
?
selectedMembers.join(",")
:
null



};





console.log(
"SAVE BODY:",
body
);





const authState =
localStorage.getItem(
"ims-auth-state"
);



let sessionId=null;



if(authState){

const parsed =
JSON.parse(authState);

sessionId =
parsed.sessionId;

}




await axios.post(

"http://localhost:3000/workflow-setup",

body,

{

headers:{

"x-session-id":sessionId

}

}

);




navigate(
"/setup/general/workflow-config/workflow-setup",
{
replace:true
}
);



}
catch(err){


console.log(err);


setError(
"Failed to save workflow setup"
);



}
finally{


setSubmitting(false);


}



};







const isFormValid =

transactionType !== "" &&

selectedLines.length>0;







return(


<Box>


<PageHeader

title="Create Workflow Setup"

subtitle="Create workflow setup lines"

/>




<Paper

variant="outlined"

sx={{
p:3,
borderRadius:2
}}

>


{
error &&

<Alert severity="error">

{error}

</Alert>

}




<Box

component="form"

onSubmit={handleSubmit}

>


<Stack spacing={3} maxWidth={720}>




<TextField

select

label="Transaction Type"

value={transactionType}


onChange={
e=>setTransactionType(
e.target.value
)
}

required

>


{
transactionTypes.map(item=>(


<MenuItem

key={
item.TransactionType_ID
}

value={
item.TransactionType_ID
}

>

{item.TypeName}

</MenuItem>


))

}


</TextField>







<Typography>

Select Workflow Lines

</Typography>




<FormGroup row>


{

lineLevels.map(line=>(


<FormControlLabel

key={line.Line_ID}


control={


<Checkbox


checked={

selectedLines.includes(
line.SortLine
)

}



onChange={()=>


handleLineChange(
line.SortLine
)


}



/>


}



label={

`${line.EnglishDescription} (Line ${line.SortLine})`

}


/>



))


}



</FormGroup>









{
selectedLines.includes(5) &&


<Box>


<Typography>

Select Approval Members

</Typography>



<FormGroup>


{

memberDepartments.map(member=>(


<FormControlLabel


key={member.Id}



control={


<Checkbox


checked={

selectedMembers.includes(
member.Id
)

}



onChange={()=>


handleMemberChange(
member.Id
)


}


/>


}



label={

member.DepartmentName_English

}


/>



))


}


</FormGroup>



<Typography>

Selected Members:
{selectedMembers.join(",")}

</Typography>



</Box>


}









<Stack

direction={{
xs:"column",
md:"row"
}}

spacing={2}

>


<TextField

label="Min Value"

value={minValue}

onChange={
e=>setMinValue(
e.target.value
)
}

fullWidth

/>



<TextField

label="Max Value"

value={maxValue}

onChange={
e=>setMaxValue(
e.target.value
)
}

fullWidth

/>



</Stack>







<TextField

label="Comments"

value={comments}

onChange={
e=>setComments(
e.target.value
)
}

multiline

rows={3}

/>







<Stack direction="row" spacing={2}>


<Button

type="submit"

variant="contained"

disabled={
submitting ||
!isFormValid
}

>


{
submitting
?
"Saving..."
:
"Create"
}



</Button>




<Button

variant="outlined"

onClick={()=>


navigate(
"/setup/general/workflow-config/workflow-setup"
)


}

>

Cancel

</Button>



</Stack>





</Stack>


</Box>


</Paper>


</Box>


);


}