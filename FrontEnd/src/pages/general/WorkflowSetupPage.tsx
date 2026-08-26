import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField
} from "@mui/material";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";


const headerCellSx = {

  whiteSpace: "nowrap",

  overflow: "hidden",

  textOverflow: "ellipsis",

  minWidth: 110,

  px: 1.5

};



type WorkflowSetupRow = {

  id: number;

  lineNo: number;

  transactionType: string;

  minValue: string;

  maxValue: string;

  comments: string;

};





const mockRows: WorkflowSetupRow[] = [

  {

    id: 1,

    lineNo: 0,

    transactionType: "Vacation Request",

    minValue: "0",

    maxValue: "1000",

    comments: "Send to Manager"

  },


  {

    id: 2,

    lineNo: 1,

    transactionType: "Vacation Request",

    minValue: "1000",

    maxValue: "5000",

    comments: "Manager Approval"

  },


  {

    id: 3,

    lineNo: 2,

    transactionType: "Purchase Request",

    minValue: "5000",

    maxValue: "10000",

    comments: "Director Approval"

  }

];






export default function WorkflowSetupPage() {


  const navigate = useNavigate();


  const [searchText, setSearchText] = useState("");

  const [error] = useState<string | null>(null);





  const filteredRows = useMemo(() => {


    const term = searchText
      .trim()
      .toLowerCase();



    if (!term) {

      return mockRows;

    }



    return mockRows.filter((row) => {


      const searchableText = [

        `Line ${row.lineNo}`,

        row.transactionType,

        row.comments,

        row.minValue,

        row.maxValue

      ]

      .join(" ")

      .toLowerCase();




      return searchableText.includes(term);


    });


  }, [searchText]);







  return (

    <Box>


      <PageHeader

        title="Workflow Setup"

        subtitle="List of workflow setup lines"

        action={

          <Stack direction="row" spacing={1}>


            <Button

              variant="contained"

              startIcon={<AddRoundedIcon />}


              onClick={() =>

                navigate(

                  "/setup/general/workflow-config/workflow-setup/new"

                )

              }


            >

              Add

            </Button>


          </Stack>

        }

      />






      <Paper

        variant="outlined"

        sx={{

          p:3,

          borderRadius:2

        }}

      >



        <Stack

          direction={{

            xs:"column",

            md:"row"

          }}

          spacing={2}

          mb={3}

        >



          <TextField

            label="Search"

            size="small"

            value={searchText}


            onChange={(event) =>

              setSearchText(

                event.target.value

              )

            }


            sx={{

              minWidth:260

            }}

          />


        </Stack>






        {

          error &&


          <Alert

            severity="error"

            sx={{mb:2}}

          >

            {error}

          </Alert>


        }







        <TableContainer>


          <Table size="small">



            <TableHead>


              <TableRow>



                <TableCell sx={headerCellSx}>

                  Line

                </TableCell>




                <TableCell sx={headerCellSx}>

                  Transaction Type

                </TableCell>





                <TableCell sx={headerCellSx}>

                  Min Value

                </TableCell>





                <TableCell sx={headerCellSx}>

                  Max Value

                </TableCell>





                <TableCell sx={headerCellSx}>

                  Comments

                </TableCell>





                <TableCell

                  align="right"

                  sx={headerCellSx}

                >

                  Action

                </TableCell>




              </TableRow>


            </TableHead>







            <TableBody>



              {

                filteredRows.length === 0 ?


                (


                  <TableRow>


                    <TableCell

                      colSpan={6}

                      align="center"

                    >

                      No workflow setup rows found.

                    </TableCell>


                  </TableRow>


                )


                :



                (


                  filteredRows.map((row)=>(


                    <TableRow

                      key={row.id}

                      hover

                    >




                      <TableCell>

                        Line {row.lineNo}

                      </TableCell>





                      <TableCell>

                        {row.transactionType}

                      </TableCell>





                      <TableCell>

                        {row.minValue}

                      </TableCell>





                      <TableCell>

                        {row.maxValue}

                      </TableCell>





                      <TableCell>

                        {row.comments}

                      </TableCell>






                      <TableCell

                        align="right"

                      >


                        <IconButton

                          size="small"

                          aria-label="Edit workflow setup"


                          onClick={() =>

                            navigate(

                              `/setup/general/workflow-config/workflow-setup/${row.id}`

                            )

                          }


                        >


                          <EditRoundedIcon

                            fontSize="small"

                          />


                        </IconButton>



                      </TableCell>





                    </TableRow>


                  ))


                )


              }



            </TableBody>



          </Table>


        </TableContainer>





      </Paper>



    </Box>

  );

}