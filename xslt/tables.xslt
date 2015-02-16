 <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="table[not(ancestor::eqn)]">
        <table>

             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
             <xsl:if test="@fontsize = '10.5'">
               <xsl:attribute name="style">
                   font-size:small
                </xsl:attribute>

            </xsl:if>

                <colgroup>
                    <xsl:apply-templates select="tgroup/colspec"/>
                </colgroup>
                 <xsl:apply-templates select="tgroup/thead"/>
            <tbody>

                <xsl:apply-templates select="tgroup/tbody/row"/>
            </tbody>
        </table>
    </xsl:template>

    <xsl:template match="thead">
         <xsl:apply-templates select="row"/>
    </xsl:template>


    <xsl:template match="row">
        <tr class="row">
            <xsl:apply-templates select="entry"/>
        </tr>
    </xsl:template>


    <xsl:template match="colspec">
        <col>
           <xsl:attribute name="style">
               width:<xsl:value-of select="@colwidth"/>
            </xsl:attribute>
        </col>
    </xsl:template>

    <xsl:template match="entry">
        <td>
             <xsl:if test="count(following-sibling::entry) = 0">
                  <xsl:attribute name="colspan">
                        <xsl:value-of select="4-count(preceding-sibling::entry)"/>
                    </xsl:attribute>
            </xsl:if>
           <xsl:attribute name="style">
               text-align:<xsl:value-of select="@align"/>
            </xsl:attribute>
            <xsl:apply-templates />
        </td>
    </xsl:template>


</xsl:stylesheet>